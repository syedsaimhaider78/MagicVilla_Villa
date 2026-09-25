import { Injectable, signal, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

export interface OnlineCallUser {
  userId: string;
  userName: string;
  role: string;
  isBusy: boolean;
  connectionId?: string;
}

export type CallState = 'idle' | 'calling' | 'ringing' | 'connected';

@Injectable({
  providedIn: 'root'
})
export class CallService {
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  private hubConnection!: signalR.HubConnection;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;

  // Ringtone / Audio context
  private audioCtx: AudioContext | null = null;
  private ringtoneInterval: any = null;

  // Reactive state
  public callState = signal<CallState>('idle');
  public activePeer = signal<{ id: string; name: string; role: string } | null>(null);
  public isMuted = signal<boolean>(false);
  public callDuration = signal<number>(0);
  public onlineUsers = signal<OnlineCallUser[]>([]);
  public isConnected = signal<boolean>(false);
  public showContactsModal = signal<boolean>(false);
  public myUserId = signal<string>('');
  public myUserName = signal<string>('');
  public myRole = signal<string>('');

  public async toggleContactsModal(): Promise<void> {
    const nextState = !this.showContactsModal();
    this.showContactsModal.set(nextState);
    if (nextState) {
      if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) {
        await this.startConnection();
      }
      this.registerCurrentUser();
      await this.requestOnlineUsers();
    }
  }

  public async requestOnlineUsers(): Promise<void> {
    if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      await this.startConnection();
    }
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.hubConnection.invoke('GetOnlineUsers');
      } catch (err) {
        console.warn('[WebRTC Call] Error requesting online users:', err);
      }
    }
  }

  private durationTimer: any = null;
  private pendingOffer: any = null;

  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  public async startConnection(): Promise<void> {
    if (this.hubConnection && (this.hubConnection.state === signalR.HubConnectionState.Connected || this.hubConnection.state === signalR.HubConnectionState.Connecting)) {
      return;
    }

    this.initRemoteAudioElement();

    if (!this.hubConnection) {
      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl('https://localhost:44373/hubs/call')
        .withAutomaticReconnect()
        .build();

      this.registerSignalListeners();
    }

    try {
      await this.hubConnection.start();
      this.isConnected.set(true);
      console.log('[WebRTC Call] Connected to CallHub');

      // Auto register current user and fetch online users
      this.registerCurrentUser();
      await this.requestOnlineUsers();

      this.hubConnection.onreconnected(async () => {
        this.isConnected.set(true);
        this.registerCurrentUser();
        await this.requestOnlineUsers();
      });

      this.hubConnection.onclose(() => {
        this.isConnected.set(false);
      });
    } catch (err) {
      console.error('[WebRTC Call] Error connecting to CallHub:', err);
      this.isConnected.set(false);
    }
  }

  public registerCurrentUser(): void {
    if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) return;

    const user = this.auth.getUser();
    const tokenUserId = this.auth.getUserId();
    const isAdmin = this.auth.isAdmin();

    let userId: string;
    if (tokenUserId) {
      userId = tokenUserId;
    } else if (user?.id) {
      userId = String(user.id);
    } else if (user?.name) {
      userId = user.name;
    } else {
      let guestId = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('mv_call_guest_id') : null;
      if (!guestId) {
        guestId = 'Guest_' + Math.floor(1000 + Math.random() * 9000);
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('mv_call_guest_id', guestId);
      }
      userId = guestId;
    }

    const userName = user?.name || (isAdmin ? 'MagicVilla Admin' : `User_${userId}`);
    const role = isAdmin ? 'Admin' : (this.auth.getRole() || user?.role || 'Client');

    this.myUserId.set(userId);
    this.myUserName.set(userName);
    this.myRole.set(role);

    this.hubConnection.invoke('RegisterUser', userId, userName, role)
      .then(() => this.requestOnlineUsers())
      .catch(err => {
        console.warn('[WebRTC Call] Failed to register user:', err);
      });
  }

  private registerSignalListeners(): void {
    // 1. Incoming Call Alert (Ringing)
    this.hubConnection.on('IncomingCall', async (callerUserId: string, callerName: string, callerRole: string, sdpOffer: any) => {
      console.log('[WebRTC Call] Incoming call from:', callerName);

      if (this.callState() !== 'idle') {
        // Automatically decline if already in a call
        await this.hubConnection.invoke('RejectCall', callerUserId, 'User is busy');
        return;
      }

      this.pendingOffer = sdpOffer;
      this.activePeer.set({ id: callerUserId, name: callerName, role: callerRole });
      this.callState.set('ringing');
      this.startIncomingRingtone();
    });

    // 2. Call Accepted by Receiver
    this.hubConnection.on('CallAccepted', async (receiverUserId: string, receiverName: string, sdpAnswer: any) => {
      console.log('[WebRTC Call] Call accepted by:', receiverName);
      this.stopRingtone();

      if (this.peerConnection) {
        try {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdpAnswer));
          this.callState.set('connected');
          this.startDurationTimer();
        } catch (err) {
          console.error('[WebRTC Call] Error setting remote description:', err);
          this.endCall();
        }
      }
    });

    // 3. Call Rejected / Busy / Failed
    this.hubConnection.on('CallRejected', (_userId: string, reason: string) => {
      this.toast.error(reason || 'Call was declined.');
      this.cleanupCallState();
    });

    this.hubConnection.on('CallBusy', (message: string) => {
      this.toast.error(message || 'User is on another call.');
      this.cleanupCallState();
    });

    this.hubConnection.on('CallFailed', (message: string) => {
      this.toast.error(message || 'Call failed.');
      this.cleanupCallState();
    });

    // 4. Remote ICE Candidate
    this.hubConnection.on('ReceiveIceCandidate', async (candidate: any) => {
      if (this.peerConnection && candidate) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[WebRTC Call] Error adding received ICE candidate:', err);
        }
      }
    });

    // 5. Call Ended by Peer
    this.hubConnection.on('CallEnded', (_byUserId: string) => {
      this.toast.success('Call ended.');
      this.cleanupCallState();
    });

    // 6. Online Callers Updated
    this.hubConnection.on('OnlineUsersUpdated', (users: OnlineCallUser[]) => {
      this.onlineUsers.set(users || []);
    });

    this.hubConnection.on('OnlineUsersList', (users: OnlineCallUser[]) => {
      this.onlineUsers.set(users || []);
    });
  }

  // --- Call Control Actions ---

  public async callUser(targetUserId: string, targetName: string, targetRole: string): Promise<void> {
    if (this.callState() !== 'idle') {
      this.toast.error('You already have an active call session.');
      return;
    }

    try {
      this.activePeer.set({ id: targetUserId, name: targetName, role: targetRole });
      this.callState.set('calling');
      this.startOutgoingRingback();

      // 1. Get microphone audio stream
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

      // 2. Initialize WebRTC peer connection
      this.peerConnection = new RTCPeerConnection(this.rtcConfig);

      // Add local audio tracks to peer connection
      this.localStream.getAudioTracks().forEach(track => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });

      // Handle remote incoming audio stream
      this.peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          this.attachRemoteStream(event.streams[0]);
        }
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.activePeer()) {
          this.hubConnection.invoke('SendIceCandidate', this.activePeer()!.id, event.candidate);
        }
      };

      // 3. Create SDP Offer
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      await this.peerConnection.setLocalDescription(offer);

      // 4. Send offer via SignalR
      await this.hubConnection.invoke('InitiateCall', targetUserId, offer);
    } catch (err: any) {
      console.error('[WebRTC Call] Error initiating call:', err);
      this.toast.error(err?.message || 'Could not access microphone.');
      this.cleanupCallState();
    }
  }

  public async acceptCall(): Promise<void> {
    if (!this.pendingOffer || !this.activePeer()) return;

    this.stopRingtone();
    try {
      // 1. Get microphone audio stream
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

      // 2. Initialize WebRTC peer connection
      this.peerConnection = new RTCPeerConnection(this.rtcConfig);

      this.localStream.getAudioTracks().forEach(track => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });

      this.peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          this.attachRemoteStream(event.streams[0]);
        }
      };

      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.activePeer()) {
          this.hubConnection.invoke('SendIceCandidate', this.activePeer()!.id, event.candidate);
        }
      };

      // 3. Set remote description from offer
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(this.pendingOffer));

      // 4. Create and set local answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // 5. Send answer to caller via SignalR
      await this.hubConnection.invoke('AcceptCall', this.activePeer()!.id, answer);

      this.callState.set('connected');
      this.startDurationTimer();
    } catch (err: any) {
      console.error('[WebRTC Call] Error accepting call:', err);
      this.toast.error(err?.message || 'Could not access microphone.');
      this.rejectCall('Microphone access denied');
    }
  }

  public async rejectCall(reason: string = 'Call declined'): Promise<void> {
    this.stopRingtone();
    if (this.activePeer()) {
      try {
        await this.hubConnection.invoke('RejectCall', this.activePeer()!.id, reason);
      } catch (err) {
        console.warn('[WebRTC Call] Error rejecting call:', err);
      }
    }
    this.cleanupCallState();
  }

  public async endCall(): Promise<void> {
    if (this.activePeer()) {
      try {
        await this.hubConnection.invoke('EndCall', this.activePeer()!.id);
      } catch (err) {
        console.warn('[WebRTC Call] Error ending call:', err);
      }
    }
    this.cleanupCallState();
  }

  public toggleMute(): void {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.isMuted.set(!audioTrack.enabled);
      }
    }
  }

  // --- Helper Routines ---

  private attachRemoteStream(stream: MediaStream): void {
    if (this.remoteAudioElement) {
      this.remoteAudioElement.srcObject = stream;
      this.remoteAudioElement.play().catch(err => {
        console.warn('[WebRTC Call] Remote audio autoplay blocked:', err);
      });
    }
  }

  private cleanupCallState(): void {
    this.stopRingtone();
    this.stopDurationTimer();

    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.remoteAudioElement) {
      this.remoteAudioElement.srcObject = null;
    }

    this.pendingOffer = null;
    this.activePeer.set(null);
    this.callState.set('idle');
    this.isMuted.set(false);
    this.callDuration.set(0);
  }

  private startDurationTimer(): void {
    this.stopDurationTimer();
    this.callDuration.set(0);
    this.durationTimer = setInterval(() => {
      this.callDuration.update(d => d + 1);
    }, 1000);
  }

  private stopDurationTimer(): void {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
  }

  private initRemoteAudioElement(): void {
    if (!this.remoteAudioElement && typeof document !== 'undefined') {
      this.remoteAudioElement = document.createElement('audio');
      this.remoteAudioElement.autoplay = true;
      document.body.appendChild(this.remoteAudioElement);
    }
  }

  // Web Audio Ringtone Synthesizer (Zero external file dependencies)
  private startIncomingRingtone(): void {
    this.stopRingtone();
    try {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playBeep = () => {
        if (!this.audioCtx || this.callState() !== 'ringing') return;
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc1.frequency.value = 753; // Dual-tone ringing frequency
        osc2.frequency.value = 852;
        gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 1.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(this.audioCtx.currentTime + 1.2);
        osc2.stop(this.audioCtx.currentTime + 1.2);
      };

      playBeep();
      this.ringtoneInterval = setInterval(playBeep, 2400);
    } catch {}
  }

  private startOutgoingRingback(): void {
    this.stopRingtone();
    try {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playRingback = () => {
        if (!this.audioCtx || this.callState() !== 'calling') return;
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc1.frequency.value = 440;
        osc2.frequency.value = 480;
        gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 1.5);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(this.audioCtx.currentTime + 1.5);
        osc2.stop(this.audioCtx.currentTime + 1.5);
      };

      playRingback();
      this.ringtoneInterval = setInterval(playRingback, 3000);
    } catch {}
  }

  private stopRingtone(): void {
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }
  }

  public getFormattedDuration(): string {
    const totalSeconds = this.callDuration();
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

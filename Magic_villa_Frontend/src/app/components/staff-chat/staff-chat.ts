import { Component, ElementRef, ViewChild, inject, signal, OnInit, AfterViewChecked, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, ChatMessage } from '../../services/chat';
import { AuthService } from '../../services/auth.service';
import { CallService } from '../../services/call.service';

@Component({
  selector: 'app-staff-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './staff-chat.html',
  styleUrl: './staff-chat.scss'
})
export class StaffChatComponent implements OnInit, AfterViewChecked {
  public chatService = inject(ChatService);
  public callService = inject(CallService);
  private authService = inject(AuthService);

  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLDivElement>;

  // User input states
  public userId: string = '';
  public selectedGroup: string = 'FrontDesk';
  public messageText: string = '';
  public newGroupName: string = '';
  public showAddGroup: boolean = false;

  // Room state
  public isJoined = signal<boolean>(false);
  public isJoining = signal<boolean>(false);

  // Predefined Staff Groups (can also be dynamically extended)
  public groups: string[] = ['FrontDesk', 'Housekeeping', 'Maintenance', 'Management', 'Concierge'];

  private shouldScrollToBottom: boolean = false;

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (user?.name) {
      this.userId = user.name;
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  @HostListener('window:focus')
  public onWindowFocus(): void {
    if (this.isJoined()) {
      this.chatService.markMessagesAsRead(this.selectedGroup, this.userId.trim());
    }
  }

  @HostListener('document:visibilitychange')
  public onVisibilityChange(): void {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible' && this.isJoined()) {
      this.chatService.markMessagesAsRead(this.selectedGroup, this.userId.trim());
    }
  }

  // 1. Join Room Action
  public async joinRoom(): Promise<void> {
    if (!this.userId.trim()) {
      alert('Please enter your Staff Name or ID!');
      return;
    }

    if (!this.selectedGroup.trim()) {
      alert('Please select or create a group!');
      return;
    }

    this.isJoining.set(true);
    try {
      this.chatService.clearMessages();
      await this.chatService.joinGroup(this.userId.trim(), this.selectedGroup);
      this.isJoined.set(true);
      this.chatService.isRoomActive.set(true);
      this.shouldScrollToBottom = true;

      // Automatically mark previous unread messages in this room as read by this user
      await this.chatService.markMessagesAsRead(this.selectedGroup, this.userId.trim());
    } catch (err) {
      console.error('Failed to join group:', err);
      alert('Failed to connect to chat room. Please check your connection.');
    } finally {
      this.isJoining.set(false);
    }
  }

  // 2. Leave Room Action (Switch Department)
  public async leaveRoom(): Promise<void> {
    if (this.isJoined()) {
      try {
        await this.chatService.leaveGroup(this.userId.trim(), this.selectedGroup);
      } catch (err) {
        console.warn('Error while leaving group:', err);
      }
      this.isJoined.set(false);
      this.chatService.isRoomActive.set(false);
      this.chatService.clearMessages();
    }
  }

  // 3. Send Message Action
  public async sendMsg(): Promise<void> {
    const trimmed = this.messageText.trim();
    if (!trimmed) return;

    try {
      this.messageText = '';
      await this.chatService.sendMessage(this.selectedGroup, this.userId.trim(), trimmed);
      this.shouldScrollToBottom = true;
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  }

  // 4. Add Custom Group
  public addCustomGroup(): void {
    const name = this.newGroupName.trim();
    if (!name) return;

    if (!this.groups.includes(name)) {
      this.groups.push(name);
    }
    this.selectedGroup = name;
    this.newGroupName = '';
    this.showAddGroup = false;
  }

  public getStatusTooltip(msg: ChatMessage): string {
    if (msg.isRead) {
      return msg.readBy ? `Seen by ${msg.readBy}` : 'Seen';
    }
    if (msg.isDelivered) {
      return 'Delivered to staff';
    }
    return 'Sent to server';
  }

  public onChatContainerClick(): void {
    if (this.isJoined()) {
      this.chatService.markMessagesAsRead(this.selectedGroup, this.userId.trim());
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer?.nativeElement) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch {}
  }
}
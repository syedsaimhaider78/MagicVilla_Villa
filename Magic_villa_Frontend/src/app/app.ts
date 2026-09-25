import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar';
import { ToastComponent } from './components/toast/toast';
import { CallModalComponent } from './components/call-modal/call-modal';
import { SignalRService } from './services/signalr.service';
import { ChatService } from './services/chat';
import { CallService } from './services/call.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, ToastComponent, CallModalComponent],
  template: `<app-navbar></app-navbar><main><router-outlet></router-outlet></main><app-toast /><app-call-modal />`
})
export class App implements OnInit {
  private signalrService = inject(SignalRService);
  private chatService = inject(ChatService);
  private callService = inject(CallService);

  ngOnInit(): void {
    this.signalrService.startConnection();
    this.chatService.startConnection();
    this.callService.startConnection();
  }
}

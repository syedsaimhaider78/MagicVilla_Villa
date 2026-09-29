import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar';
import { ToastComponent } from './components/toast/toast';
import { CallModalComponent } from './components/call-modal/call-modal';
import { SignalRService } from './services/signalr.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, ToastComponent, CallModalComponent],
  template: `
    <app-navbar></app-navbar>
    <main>
      <router-outlet></router-outlet>
    </main>
    <app-toast />
    @defer (on idle) {
      <app-call-modal />
    }
  `
})
export class App implements OnInit {
  private signalrService = inject(SignalRService);

  ngOnInit(): void {
    // Schedule background notifications on idle so initial paint & TBT remain ultra-fast
    if (typeof window !== 'undefined') {
      const initSockets = () => {
        this.signalrService.startConnection();
      };
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(initSockets);
      } else {
        setTimeout(initSockets, 1200);
      }
    }
  }
}

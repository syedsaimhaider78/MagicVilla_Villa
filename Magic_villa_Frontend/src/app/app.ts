import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar';
import { ToastComponent } from './components/toast/toast';
import { SignalRService } from './services/signalr.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, ToastComponent],
  template: `<app-navbar></app-navbar><main><router-outlet></router-outlet></main><app-toast />`
})
export class App implements OnInit {
  private signalrService = inject(SignalRService);

  ngOnInit(): void {
    this.signalrService.startConnection();
  }
}

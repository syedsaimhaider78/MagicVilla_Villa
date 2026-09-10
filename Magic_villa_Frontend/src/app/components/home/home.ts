import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { VillaService } from '../../services/villa.service';
import { Villa } from '../../models/villa.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class HomeComponent implements OnInit {
  featuredVillas: Villa[] = [];
  loading = true;

  constructor(private villaService: VillaService) {}

  ngOnInit(): void {
    this.villaService.getAllVillas().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res?.result || [];
        this.featuredVillas = list.slice(0, 3); // top 3 for showcase
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}

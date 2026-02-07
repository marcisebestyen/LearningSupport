import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpRequestService } from '../../services/http-request.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-mindmaps',
  imports: [CommonModule],
  templateUrl: './mindmaps.html',
  styleUrl: './mindmaps.scss',
})
export class MindmapsComponent implements OnInit {
  private router = inject(Router);
  private httpService = inject(HttpRequestService);

  mindmapSets = signal<any[]>([]);

  ngOnInit() {
    this.loadMindmaps();
  }

  loadMindmaps() {
    this.httpService.loadMindMapsRequest()
      .subscribe({
        next: (data) => {
          this.mindmapSets.set(data);
        },
        error: (error) => {
          console.error("Failed to load Mindmaps", error);
        }
      });
  }

  openMap(id: number) {
    this.router.navigate(['/mindmap-player', id]);
  }
}

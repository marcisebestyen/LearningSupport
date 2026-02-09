import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpRequestService } from '../../services/http-request.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-essays',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './essays.html',
  styleUrl: './essays.scss',
})
export class EssaysComponent implements OnInit {
  private httpService = inject(HttpRequestService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  essayList = signal<any[]>([]);
  selectedEssay = signal<any | null>(null);
  isLoading = signal(false);

  ngOnInit() {
    this.loadEssayList();
  }

  loadEssayList() {
    this.httpService.getAllEssaysRequest()
    .subscribe({
      next: (data) => {
        const processData = this.processEssayTitles(data);

        const sorted = processData.sort((a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        this.essayList.set(sorted);

        const routeId = this.route.snapshot.paramMap.get('id');
        if (routeId) {
          const id = Number(routeId);
          this.selectEssay(id);
        }
      },
      error: (error) => {
        console.error("Error loading Essay list", error);
      }
    });
  }

  selectEssay(id: number) {
    this.isLoading.set(true);
    this.router.navigate(['essays/', id], { replaceUrl: true });

    this.httpService.getEssayDetailRequest(id)
      .subscribe({
        next: (detail) => {
          this.selectedEssay.set(detail);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error("Error loading Essay detail", error);
          this.isLoading.set(false);
        }
      });
  }

  processEssayTitles(essays: any[]): any[] {
    const groups: { [key: string]: any[] } = {};

    essays.forEach(essay => {
      const name = essay.document_filename || 'Unknown document';
      if (!groups[name]) {
        groups[name] = [];
      }
      groups[name].push(essay);
    });

    Object.keys(groups).forEach(filename => {
      const group = groups[filename];
      group.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      group.forEach((essay, index) => {
        if (group.length  === 1) {
          essay.displayTitle = filename;
        } else {
          essay.displayTitle = `${filename} #${index + 1}`;
        }
      });
    });

    return essays;
  }

  getScoreColor(score: number): string {
    if (score >= 80) return '#008000';
    if (score >= 50) return '#f8cd02';
    return '#ff0000';
  }
}

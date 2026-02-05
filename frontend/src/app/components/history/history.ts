import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpRequestService } from '../../services/http-request.service';
import { MarkdownModule } from 'ngx-markdown';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, MarkdownModule],
  templateUrl: './history.html',
  styleUrl: './history.scss'
})
export class HistoryComponent {
  private httpService = inject(HttpRequestService);
  private router = inject(Router);

  history = signal<any[]>([]);
  selectedSummary = signal<string | null>(null);
  selectedFilename = signal<string>('');
  selectedDocId = signal<number | null>(null);
  isGeneratingQuiz = signal(false);

  ngOnInit() {
    this.loadHistory();
  }

  loadHistory() {
    this.httpService.loadHistoryRequest()
      .subscribe({
        next: (data) => {
          console.log("History data loaded: ", data);
          this.history.set(data);
        },
        error: (error) => {
          console.log("Failed to load history: ", error);
        }
      });
  }

  selectDoc(item: any) {
    this.selectedSummary.set(item.summary);
    this.selectedFilename.set(item.filename);
    this.selectedDocId.set(item.id);
  }

  deleteDoc(event: Event, item: any) {
    event.stopPropagation();

    if (!confirm(`Are you sure you wanna delete "${item.filename}"?"`)) {
      return;
    }

    this.httpService.deleteDocRequest(item)
      .subscribe({
        next: () => {
          this.history.update(currentList => currentList.filter(d => d.id !== item.id));

          if (this.selectedDocId === item.id) {
            this.selectedSummary.set(null);
            this.selectedFilename.set('');
            this.selectedDocId.set(null);
          }
        },
        error: (error) => {
          console.error('Failed to delete ', error);
        }
      });
  }

  generateQuiz() {
    const docId = this.selectedDocId();
    if (!docId) return;

    this.isGeneratingQuiz.set(true);

    this.httpService.generateQuizRequest(docId)
      .pipe(
        finalize(() => {
          this.isGeneratingQuiz.set(false);
        })
      )
      .subscribe({
        next: (res) => {
          console.log("Quiz Response:", res);
          const idToPlay = res.quiz_id || res.id;

          if (idToPlay) {
            this.router.navigate(['/quiz-player', idToPlay]);
          } else {
            console.error("Could not find quiz ID in response!", res);
            alert("Error: Quiz created but ID missing. Check console.");
          }
        },
        error: (error) => {
          console.error('Quiz generation failed: ', error);
        }
      })
  }
}

import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MarkdownModule } from 'ngx-markdown';
import { Router } from '@angular/router';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, MarkdownModule],
  templateUrl: './history.html',
  styleUrl: './history.scss'
})
export class HistoryComponent {
  private http = inject(HttpClient);
  private router = inject(Router);

  history = signal<any[]>([]);
  selectedSummary = signal<string | null>(null);
  selectedFilename = signal<string>('');
  selectedDocId = signal<number | null>(null);

  ngOnInit() {
    this.loadHistory();
  }

  loadHistory() {
    this.http.get<any[]>('http://127.0.0.1:8000/history')
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

    this.http.delete(`http://127.0.0.1:8000/delete/${item.id}`)
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

    this.http.post<any>(`http://127.0.0.1:8000/documents/${docId}/quiz`, {})
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

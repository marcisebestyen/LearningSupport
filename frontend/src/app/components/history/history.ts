import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MarkdownModule } from 'ngx-markdown';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, MarkdownModule],
  templateUrl: './history.html',
  styleUrl: './history.scss'
})
export class HistoryComponent {
  private http = inject(HttpClient);

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
    this.selectedFilename.set(item.name);
    this.selectedDocId.set(item.id);
  }
}

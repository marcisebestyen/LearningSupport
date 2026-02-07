import { Component, signal, inject, computed, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpRequestService } from '../../services/http-request.service';
import { MarkdownModule } from 'ngx-markdown';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, MarkdownModule, FormsModule],
  templateUrl: './history.html',
  styleUrl: './history.scss'
})
export class HistoryComponent implements AfterViewChecked {
  private httpService = inject(HttpRequestService);
  private router = inject(Router);

  history = signal<any[]>([]);
  selectedSummary = signal<string | null>(null);
  selectedFilename = signal<string>('');
  selectedDocId = signal<number | null>(null);
  isGeneratingQuiz = signal(false);
  selectedFilter = signal<string>('ALL');
  categories = computed(() => {
    return [...new Set(this.history().map(doc => doc.category).filter(c => !!c))].sort();
  });
  filteredHistory = computed(() => {
    const filter = this.selectedFilter();
    const list = this.history();

    if (filter === 'ALL') {
      return list;
    }

    return list.filter(doc => doc.category === filter);
  });
  chatMessages = signal<{role: 'user' | 'ai', text: string}[]>([]);
  chatInput = signal('');
  isChatLoading = signal(false);
  showChat = signal(false);
  isGeneratingCards = signal(false);
  isGeneratingMindMap = signal(false);
  isGeneratingAudio = signal(false);

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

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  selectDoc(item: any) {
    this.selectedSummary.set(item.summary);
    this.selectedFilename.set(item.filename);
    this.selectedDocId.set(item.id);
    this.showChat.set(false);

    this.loadChatHistory(item.id);
  }

  loadChatHistory(docId: number) {
    this.httpService.loadChatHistoryRequest(docId)
      .subscribe({
        next: (msgs) => {
          const formatted = msgs.map(m => ({ role: m.role, text: m.content }));
          this.chatMessages.set(formatted);
        }
      });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch (error) { }
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

  startFlashcards() {
    const docId = this.selectedDocId();
    if (!docId) return;

    this.isGeneratingCards.set(true);

    this.httpService.generateFlashcardRequest(docId)
      .pipe(
        finalize(() => {
          this.isGeneratingCards.set(false);
        })
      )
      .subscribe({
        next: (res) => {
          this.router.navigate(['/flashcard-player', res.set_id]);
        },
        error: (error) => {
          console.error('Failed to start flashcards: ', error);
        }
      });
  }

  generateMindMap() {
    const docId = this.selectedDocId();
    if (!docId) return;

    this.isGeneratingMindMap.set(true);

    this.httpService.generateMindMapRequest(docId)
      .pipe(finalize(() => this.isGeneratingMindMap.set(false)))
      .subscribe({
        next: (res) => {
          this.router.navigate(['/mindmap-player', res.id]);
        },
        error: (error) => {
          console.error('Failed to generate mind map: ', error);
          alert('Could not generate mind map. Please try again.');
        }
      });
  }

  generateAudio() {
    const docId = this.selectedDocId();
    if (!docId) return;

    this.isGeneratingAudio.set(true);

    this.httpService.generateDocumentAudioRequest(docId)
      .pipe(
        finalize(() => {
          this.isGeneratingAudio.set(false);
        })
      )
      .subscribe({
        next: (res) => {
          console.log("Audio generations response: ", res);

          this.history.update(list => list.map(doc =>
            doc.id === docId ? { ...doc, google_drive_id: res.drive_id, has_audio: true } : doc
          ));

          this.router.navigate(['/audios']);
        },
        error: (error) => {
          console.error('Failed to generate audio audio response: ', error);
          alert('Could not generate audio audio audio response. Make sure the document has summary.');
        }
      });
  }

  sendMessage() {
    const text = this.chatInput();
    if (!text.trim() || !this.selectedDocId()) {
      return;
    }

    this.chatMessages.update(msgs => [...msgs, { role: 'user', text }]);
    this.chatInput.set('');
    this.isChatLoading.set(true);

    this.httpService.chatWithDocRequest(this.selectedDocId()!, text)
      .pipe(
        finalize(() => this.isChatLoading.set(false))
      )
      .subscribe({
        next: (res) => {
          this.chatMessages.update(msgs => [...msgs, { role: 'ai', text: res.answer }]);
        },
        error: (error) => {
          console.error('Failed to update chat: ', error);
        }
      });
  }
}

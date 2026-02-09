import { Component, signal, inject, computed, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpRequestService } from '../../services/http-request.service';
import { MarkdownModule } from 'ngx-markdown';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import {DragDropDirective} from '../../directives/drag-drop';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, MarkdownModule, FormsModule, DragDropDirective],
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
  chatMessages = signal<{role: string, text: string, status?: string}[]>([]);
  chatInput = signal('');
  isChatLoading = signal(false);
  showChat = signal(false);
  isGeneratingCards = signal(false);
  isGeneratingMindMap = signal(false);
  isGeneratingAudio = signal(false);
  activeTab = signal<'summary' | 'chat' | 'tutor' | 'grader'>('summary');
  isTyping = signal(false);
  sessionFinished = signal(false);
  essayInputMode = signal<'type' | 'upload'>('type');
  essayText = signal('');
  essayFile = signal<File | null>(null);
  isGrading = signal(false);
  gradedResult = signal<any | null>(null);
  pastEssays = signal<any[]>([]);

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
    if (!text.trim() || !this.selectedDocId() || this.isTyping()) {
      return;
    }

    const currentTab = this.activeTab();

    this.chatMessages.update(msgs => [...msgs, { role: 'user', text, status: 'neutral' }]);
    this.chatInput.set('');
    this.isChatLoading.set(true);

    const docId = this.selectedDocId();

    if (currentTab === 'tutor') {
      this.httpService.replyToTutorRequest(docId!, text)
        .pipe(finalize(() => this.isChatLoading.set(false)))
        .subscribe({
          next: (res) => {
            if (res.is_finish) {
              this.sessionFinished.set(true);
            }

            this.typeWriterEffect(res.text, res.status);
          },
          error: () => this.isChatLoading.set(false)
        });
    } else {
      this.httpService.chatWithDocRequest(docId!, text)
        .pipe(finalize(() => this.isChatLoading.set(false)))
        .subscribe({
          next: (res) => {
            this.typeWriterEffect(res.answer, 'neutral');
          },
          error: () => this.isChatLoading.set(false)
        });
    }
  }

  switchTab(tab: 'summary' | 'chat' | 'tutor' | 'grader') {
    this.activeTab.set(tab);

    if (tab !== 'tutor') {
      this.sessionFinished.set(false);
    }

    if (tab === 'summary') return;

    const docId = this.selectedDocId();
    this.isChatLoading.set(true);

    if (tab === 'grader') {
      this.loadEssayHistory();
    }

    if (tab === 'chat') {
      this.httpService.loadChatHistoryRequest(docId!, 'chat')
        .pipe(finalize(() => this.isChatLoading.set(false)))
        .subscribe(msgs => this.mapMessages(msgs));
    } else if (tab === 'tutor') {
      this.httpService.loadChatHistoryRequest(docId!, 'tutor')
        .pipe(finalize(() => this.isChatLoading.set(false)))
        .subscribe(msgs => {
          this.mapMessages(msgs);

          if (msgs.length === 0) {
            this.startTutor();
          }
        });
    }
  }

  mapMessages(msgs: any[]) {
    let finishedFound = false;
    const formatted = msgs.map(m => {
      const parsed = this.parseMessage(m.content);

      if (parsed.is_finish) {
        finishedFound = true;
      }

      return {
        role: (m.role === 'user' || m.role === 'tutor_user') ? 'user' : 'ai',
        text: parsed.text,
        status: parsed.status || 'neutral',
      };
    });
    this.chatMessages.set(formatted);

    if (this.activeTab() === 'tutor') {
      this.sessionFinished.set(finishedFound);
    }
  }

  startTutor() {
    this.isChatLoading.set(true);
    this.httpService.startTutorSessionRequest(this.selectedDocId()!)
      .pipe(finalize(() => this.isChatLoading.set(false)))
      .subscribe(res => {
        this.chatMessages.update(m => [...m, {role: 'ai', text: res.message || res}]);
      });
  }

  restartTutor() {
    const docId = this.selectedDocId();
    if (!docId) return;

    if (!confirm('Are you sure you want to reset this session?')) {
      return;
    }

    this.isChatLoading.set(true);

    this.httpService.resetTutorSessionRequest(docId!)
      .pipe(finalize(() => {

      }))
      .subscribe({
        next: () => {
          this.chatMessages.set([]);
          this.sessionFinished.set(false);
          this.isTyping.set(false);

          this.startTutor();
        },
        error: (error) => {
          console.error("Error resetting tutor.", error);
          this.sessionFinished.set(false);
        }
      });
  }

  parseMessage(content: string): { text: string, status: string, is_finish?: boolean } {
    try {
      const data = JSON.parse(content);
      if (data.text && data.status) {
        return data;
      }
      return { text: content, status: 'neutral', is_finish: false };
    } catch (error) {
      return { text: content, status: 'neutral', is_finish: false };
    }
  }

  typeWriterEffect(fullText: string, status: string) {
    this.isTyping.set(true);
    let currentText = '';
    const speed = 15;

    this.chatMessages.update(msgs => [...msgs, { role: 'ai', text: '', status: status }]);
    const msgIndex = this.chatMessages().length - 1;

    let i = 0;
    const interval = setInterval(() => {
      currentText += fullText.charAt(i);

      this.chatMessages.update(msgs => {
        const newMsgs = [...msgs];
        newMsgs[msgIndex] = { ...newMsgs[msgIndex], text: currentText };
        return newMsgs;
      });

      i++;
      if (i >= fullText.length) {
        clearInterval(interval);
        this.isTyping.set(false);
      }
    }, speed);
  }

  onEssayFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.essayFile.set(file);
    }
  }

  submitEssay() {
    const docId = this.selectedDocId();
    if (!docId) return;

    this.isGrading.set(true);
    this.gradedResult.set(null);

    if (this.essayInputMode() === 'type') {
      this.httpService.gradeEssayTextRequest(docId, this.essayText())
        .pipe(finalize(() => this.isGrading.set(false)))
        .subscribe({
          next: (res) => {
            this.gradedResult.set(res);
          },
          error: (error) => {
            console.error("Error grading essay.", error);
          }
        });
    } else {
      const file = this.essayFile();
      if (!file) {
        this.isGrading.set(false);
        return;
      }

      this.httpService.gradeEssayFileRequest(docId, file)
        .pipe(finalize(() => this.isGrading.set(false)))
        .subscribe({
          next: (res) => {
            this.gradedResult.set(res);
          },
          error: (error) => {
            console.error("Error grading essay.", error);
          }
        });
    }
  }

  loadEssayHistory() {
    this.httpService.getAllEssaysRequest()
      .subscribe({
        next: (allEssays) => {
          const relevant = allEssays.filter(e => e.document_id === this.selectedDocId());
          relevant.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

          this.pastEssays.set(allEssays);
        }
      });
  }

  viewPastEssay(essayId: number) {
    this.isGrading.set(true);

    this.httpService.getEssayDetailRequest(essayId)
      .pipe(finalize(() => this.isGrading.set(false)))
      .subscribe({
        next: (fullDetails) => {
          this.gradedResult.set(fullDetails);
        },
        error: (err) => console.error("Could not load essay details", err)
      });
  }

  resetEssay() {
    this.gradedResult.set(null);
    this.essayText.set('');
    this.essayFile.set(null);
  }

  getScoreColor(score: number): string {
    if (score >= 80) return '#2ecc71';
    if (score >= 50) return '#f1c40f';
    return '#e74c3c';
  }
}

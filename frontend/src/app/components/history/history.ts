import { Component, signal, inject, computed, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpRequestService } from '../../services/http-request.service';
import { MarkdownModule } from 'ngx-markdown';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { DragDropDirective } from '../../directives/drag-drop';

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
  selectedFilter = signal<string>('ALL');

  categories = computed(() => {
    return [...new Set(this.history().map(doc => doc.category).filter(c => !!c))].sort();
  });

  filteredHistory = computed(() => {
    const filter = this.selectedFilter();
    const list = this.history();
    return filter === 'ALL' ? list : list.filter(doc => doc.category === filter);
  });

  chatMessages = signal<{ role: string, text: string, status?: string }[]>([]);
  chatInput = signal('');
  isChatLoading = signal(false);
  showChat = signal(false);
  activeTab = signal<'summary' | 'chat' | 'tutor' | 'grader'>('summary');
  isTyping = signal(false);
  sessionFinished = signal(false);

  isGeneratingQuiz = signal(false);
  isGeneratingCards = signal(false);
  isGeneratingMindMap = signal(false);
  isGeneratingAudio = signal(false);

  essayInputMode = signal<'type' | 'upload'>('type');
  essayText = signal('');
  essayFile = signal<File | null>(null);
  isGrading = signal(false);

  ngOnInit() {
    this.loadHistory();
  }

  loadHistory() {
    this.httpService.loadHistoryRequest().subscribe({
      next: (data) => this.history.set(data),
      error: (error) => console.log("Failed to load history: ", error)
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
    const mode = this.activeTab() === 'tutor' ? 'tutor' : 'chat';

    this.httpService.loadChatHistoryRequest(docId, mode).subscribe({
      next: (msgs) => this.mapMessages(msgs)
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
    } catch (error) {}
  }

  deleteDoc(event: Event, item: any) {
    event.stopPropagation();
    if (!confirm(`Are you sure you wanna delete "${item.filename}"?"`)) return;

    this.httpService.deleteDocRequest(item).subscribe({
      next: () => {
        this.history.update(currentList => currentList.filter(d => d.id !== item.id));
        if (this.selectedDocId() === item.id) {
          this.selectedSummary.set(null);
          this.selectedFilename.set('');
          this.selectedDocId.set(null);
        }
      },
      error: (error) => console.error('Failed to delete ', error)
    });
  }

  generateQuiz() {
    const docId = this.selectedDocId();
    if (!docId) return;
    this.isGeneratingQuiz.set(true);
    this.httpService.generateQuizRequest(docId)
      .pipe(finalize(() => this.isGeneratingQuiz.set(false)))
      .subscribe({
        next: (res) => {
          const idToPlay = res.quiz_id || res.id;
          if (idToPlay) this.router.navigate(['/quiz-player', idToPlay]);
        },
        error: (error) => console.error('Quiz generation failed: ', error)
      })
  }

  startFlashcards() {
    const docId = this.selectedDocId();
    if (!docId) return;
    this.isGeneratingCards.set(true);
    this.httpService.generateFlashcardRequest(docId)
      .pipe(finalize(() => this.isGeneratingCards.set(false)))
      .subscribe({
        next: (res) => this.router.navigate(['/flashcard-player', res.set_id]),
        error: (error) => console.error('Failed to start flashcards: ', error)
      });
  }

  generateMindMap() {
    const docId = this.selectedDocId();
    if (!docId) return;
    this.isGeneratingMindMap.set(true);
    this.httpService.generateMindMapRequest(docId)
      .pipe(finalize(() => this.isGeneratingMindMap.set(false)))
      .subscribe({
        next: (res) => this.router.navigate(['/mindmap-player', res.id]),
        error: (error) => alert('Could not generate mind map.')
      });
  }

  generateAudio() {
    const docId = this.selectedDocId();
    if (!docId) return;
    this.isGeneratingAudio.set(true);
    this.httpService.generateDocumentAudioRequest(docId)
      .pipe(finalize(() => this.isGeneratingAudio.set(false)))
      .subscribe({
        next: (res) => {
          this.history.update(list => list.map(doc =>
            doc.id === docId ? {...doc, google_drive_id: res.drive_id, has_audio: true} : doc
          ));
          this.router.navigate(['/audios']);
        },
        error: (error) => alert('Could not generate audio.')
      });
  }

  sendMessage() {
    const text = this.chatInput();
    if (!text.trim() || !this.selectedDocId() || this.isTyping()) return;

    this.chatMessages.update(msgs => [...msgs, {role: 'user', text, status: 'neutral'}]);
    this.chatInput.set('');
    this.isChatLoading.set(true);

    const docId = this.selectedDocId();

    if (this.activeTab() === 'tutor') {
      this.httpService.replyToTutorRequest(docId!, text)
        .pipe(finalize(() => this.isChatLoading.set(false)))
        .subscribe({
          next: (res) => {
            if (res.is_finish) this.sessionFinished.set(true);
            this.typeWriterEffect(res.text, res.status);
          },
          error: () => this.isChatLoading.set(false)
        });
    } else {
      this.httpService.chatWithDocRequest(docId!, text)
        .pipe(finalize(() => this.isChatLoading.set(false)))
        .subscribe({
          next: (res) => this.typeWriterEffect(res.answer, 'neutral'),
          error: () => this.isChatLoading.set(false)
        });
    }
  }

  switchTab(tab: 'summary' | 'chat' | 'tutor' | 'grader') {
    this.activeTab.set(tab);
    if (tab !== 'tutor') this.sessionFinished.set(false);
    if (tab === 'summary') return;

    const docId = this.selectedDocId();

    if (tab === 'grader') return;

    this.isChatLoading.set(true);

    const mode = tab === 'tutor' ? 'tutor' : 'chat';
    this.httpService.loadChatHistoryRequest(docId!, mode)
      .pipe(finalize(() => this.isChatLoading.set(false)))
      .subscribe(msgs => {
        this.mapMessages(msgs);
        if (tab === 'tutor' && msgs.length === 0) {
          this.startTutor();
        }
      });
  }

  mapMessages(msgs: any[]) {
    let finishedFound = false;
    const formatted = msgs.map(m => {
      const parsed = this.parseMessage(m.content);
      if (parsed.is_finish) finishedFound = true;
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
    if (!confirm('Are you sure you want to reset this session?')) return;
    const docId = this.selectedDocId();
    this.isChatLoading.set(true);
    this.httpService.resetTutorSessionRequest(docId!)
      .subscribe({
        next: () => {
          this.chatMessages.set([]);
          this.sessionFinished.set(false);
          this.isTyping.set(false);
          this.startTutor();
        },
        error: (error) => {
          console.error("Error resetting tutor.", error);
          this.isChatLoading.set(false);
        }
      });
  }

  parseMessage(content: string): { text: string, status: string, is_finish?: boolean } {
    try {
      const data = JSON.parse(content);
      if (data.text && data.status) return data;
      return {text: content, status: 'neutral', is_finish: false};
    } catch (error) {
      return {text: content, status: 'neutral', is_finish: false};
    }
  }

  typeWriterEffect(fullText: string, status: string) {
    this.isTyping.set(true);
    let currentText = '';
    const speed = 15;
    this.chatMessages.update(msgs => [...msgs, {role: 'ai', text: '', status: status}]);
    const msgIndex = this.chatMessages().length - 1;
    let i = 0;
    const interval = setInterval(() => {
      currentText += fullText.charAt(i);
      this.chatMessages.update(msgs => {
        const newMsgs = [...msgs];
        newMsgs[msgIndex] = {...newMsgs[msgIndex], text: currentText};
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
    if (file) this.essayFile.set(file);
  }

  onFileDropped(file: File) {
    if (file) this.essayFile.set(file);
  }

  removeEssayFile() {
    this.essayFile.set(null);
    const fileInput = document.getElementById('essayFileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  submitEssay() {
    const docId = this.selectedDocId();
    if (!docId) return;

    this.isGrading.set(true);

    const observer = {
      next: (res: any) => {
        console.log("Grading complete, redirecting to: ", res.id);
        this.router.navigate(['/essays', res.id]);
      },
      error: (err: any) => {
        console.error("Error grading essay..", err);
        alert('Grading failed, please try again.');
        this.isGrading.set(false);
      }
    };

    if (this.essayInputMode() === 'type') {
      this.httpService.gradeEssayTextRequest(docId, this.essayText())
        .subscribe(observer);
    } else {
      const file = this.essayFile();
      if (!file) {
        this.isGrading.set(false);
        return;
      }
      this.httpService.gradeEssayFileRequest(docId, file)
        .subscribe(observer);
    }
  }
}

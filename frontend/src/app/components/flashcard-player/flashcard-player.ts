import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpRequestService } from '../../services/http-request.service';

@Component({
  selector: 'app-flashcard-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './flashcard-player.html',
  styleUrl: './flashcard-player.scss',
})
export class FlashcardPlayerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private httpService = inject(HttpRequestService);

  cards = signal<{front: string, back: string}[]>([]);
  currentIndex = signal(0);
  isFlipped = signal(false);
  isLoading = signal(true);

  ngOnInit() {
    const setId = this.route.snapshot.paramMap.get('id');
    if (setId) {
      this.loadCards(setId);
    }
  }

  loadCards(setId: string) {
    this.httpService.getFlashcardSetRequest(setId)
      .subscribe({
        next: (data) => {
          this.cards.set(data);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error("Error loading cards.", error);
          this.isLoading.set(false);
        }
      });
  }

  flipCard() {
    this.isFlipped.update(v => !v);
  }

  nextCard() {
    if (this.currentIndex() < this.cards().length - 1) {
      this.isFlipped.set(false);
      setTimeout(() => {
        this.currentIndex.update(i => i + 1)
      }, 150);
    }
  }

  previousCard() {
    if (this.currentIndex() > 0) {
      this.isFlipped.set(false);
      setTimeout(() => {
        this.currentIndex.update(i => i - 1);
      }, 150)
    }
  }

  exit() {
    this.router.navigate(['/flashcards']);
  }
}

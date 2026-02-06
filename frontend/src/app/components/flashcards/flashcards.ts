import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpRequestService } from '../../services/http-request.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-flashcards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './flashcards.html',
  styleUrl: './flashcards.scss',
})
export class FlashcardsComponent implements OnInit {
  private router = inject(Router);
  private httpService = inject(HttpRequestService);

  flashcardSets = signal<any[]>([]);

  ngOnInit() {
    this.loadFlashcards();
  }

  loadFlashcards() {
    this.httpService.loadFlashcardsRequest()
      .subscribe({
        next: (data) => {
          this.flashcardSets.set(data);
        },
        error: (error) => {
          console.error('Failed to load flashcards ', error);
        }
      });
  }

  openSet(id: number) {
    this.router.navigate(['/flashcard-player', id]);
  }
}

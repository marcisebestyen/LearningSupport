import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {Router, RouterModule} from '@angular/router';

@Component({
  selector: 'app-quizzes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quizzes.html',
  styleUrl: './quizzes.scss',
})
export class QuizzesComponent {
  private http = inject(HttpClient);
  private router = inject(Router);

  quizzes = signal<any[]>([]);

  ngOnInit() {
    this.loadQuizzes();
  }

  loadQuizzes() {
    this.http.get<any[]>(`http://127.0.0.1:8000/quizzes`).subscribe({
      next: (data) => {
        this.quizzes.set(data);
      },
      error: (error) => {
        console.error('Failed to load quizzes ', error);
      }
    });
  }

  playQuiz(id: number) {
    this.router.navigate(['/quiz-player', id]);
  }
}

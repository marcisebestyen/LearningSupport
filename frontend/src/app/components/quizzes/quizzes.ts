import {Component, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {HttpRequestService} from '../../services/http-request.service';
import {Router} from '@angular/router';

@Component({
  selector: 'app-quizzes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quizzes.html',
  styleUrl: './quizzes.scss',
})
export class QuizzesComponent {
  private router = inject(Router);
  private httpService = inject(HttpRequestService);

  quizzes = signal<any[]>([]);

  ngOnInit() {
    this.loadQuizzes();
  }

  loadQuizzes() {
    this.httpService.loadQuizzesRequest()
      .subscribe({
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

  reviewQuiz(id: number) {
    this.router.navigate(['/quiz-player', id], { queryParams: { mode: 'review' } });
  }
}

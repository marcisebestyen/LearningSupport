import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpRequestService } from '../../services/http-request.service';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

interface Question {
  question_text: string;
  options: string[];
  correct_answer: string;
}

interface QuizData {
  id: number;
  questions: Question[];
}

@Component({
  selector: 'quiz-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quiz-player.html',
  styleUrl: 'quiz-player.scss'
})
export class QuizPlayerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private httpService = inject(HttpRequestService);
  private http = inject(HttpClient);

  quizId: string | null = null;
  quizData = signal<QuizData | null>(null);

  currentQuestionIndex = signal(0);
  userAnswers = signal<string[]>([]);
  score = signal<number | null>(null);
  loading = signal(true);

  ngOnInit() {
    this.quizId = this.route.snapshot.paramMap.get('id');
    if (this.quizId) {
      this.loadQuiz(this.quizId);
    }
  }

  loadQuiz(id: string) {
    this.httpService.loadQuizRequest(id)
      .subscribe({
        next: (data: any) => {
          this.quizData.set(data);
          this.userAnswers.set(new Array(data.questions.length).fill(null));
          this.loading.set(false);
        },
        error: (error) => {
          this.router.navigate(['/quizzes']);
        }
      });
  }

  selectOption(option: string) {
    const answers = [...this.userAnswers()];
    answers[this.currentQuestionIndex()] = option;
    this.userAnswers.set(answers);
  }

  nextQuestion() {
    const data = this.quizData();

    if (!data) return;

    if (this.currentQuestionIndex() < data.questions.length - 1) {
      this.currentQuestionIndex.update(i => i + 1);
    }
  }

  prevQuestion() {
    if (this.currentQuestionIndex() > 0) {
      this.currentQuestionIndex.update(i => i - 1);
    }
  }

  submitQuiz() {
    const data = this.quizData();

    if (!data) return;

    if (!confirm("Are you sure you want to submit?")) return;

    let calculatedScore = 0;

    const questions = data.questions;
    const answers = this.userAnswers();

    questions.forEach((q: any, index: number) => {
      if (answers[index] === q.correct_answer) {
        calculatedScore++;
      }
    });

    this.score.set(calculatedScore);

    if (this.quizId) {
      this.httpService.submitQuizRequest(this.quizId, calculatedScore)
        .subscribe({
          next: (res) => {
            console.log("Score submitted successfully.");
          },
          error: (error) => {
            console.error("Error submitting score ", error);
          }
        })
    }
  }

  backToMenu() {
    this.router.navigate(['/quizzes']);
  }
}

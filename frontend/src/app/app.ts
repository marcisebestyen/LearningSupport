import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent {
  authService = inject(AuthService);
  private router = inject(Router);

  currentRouteName = computed(() => {
    const url = this.router.url;
    if (url.includes('upload')) return 'Upload Document';
    if (url.includes('history')) return 'Document History';
    if (url.includes('login')) return 'Authentication';
    if (url.includes('quiz-player')) return 'Quiz Session';
    if (url.includes('quizzes')) return 'My Quizzes';
    if (url.includes('flashcard-player')) return 'Flashcard Session';
    if (url.includes('flashcards')) return 'My Flashcards';
    if (url.includes('mindmap-player')) return 'Mind Map Session';
    if (url.includes('mindmaps')) return "My Mind Maps";
    if (url.includes('audios')) return "My Audios";
    if (url.includes('essays')) return 'My Essays';
    return 'Welcome';
  });

  handleLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

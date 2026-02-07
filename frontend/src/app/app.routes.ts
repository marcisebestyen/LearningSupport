import { Routes } from '@angular/router';
import { FileUploadComponent } from './components/file-upload/file-upload';
import { HistoryComponent } from './components/history/history';
import { LoginComponent } from './components/login/login';
import { QuizzesComponent } from './components/quizzes/quizzes';
import { QuizPlayerComponent } from './components/quiz-player/quiz-player';
import { FlashcardsComponent } from './components/flashcards/flashcards';
import { FlashcardPlayerComponent } from './components/flashcard-player/flashcard-player';
import { MindmapsComponent } from './components/mindmaps/mindmaps';
import { MindmapPlayerComponent } from './components/mindmap-player/mindmap-player';

export const routes: Routes = [
  { path: '', redirectTo: 'upload', pathMatch: 'full' },
  { path: 'upload', component: FileUploadComponent },
  { path: 'history', component: HistoryComponent },
  { path: 'login', component: LoginComponent },
  { path: 'quizzes', component: QuizzesComponent },
  { path: 'quiz-player/:id', component: QuizPlayerComponent },
  { path: 'flashcards', component: FlashcardsComponent },
  { path: 'flashcard-player/:id', component: FlashcardPlayerComponent },
  { path: 'mindmaps', component: MindmapsComponent },
  { path: 'mindmap-player/:id', component: MindmapPlayerComponent },
];

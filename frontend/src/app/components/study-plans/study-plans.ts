import { Component, signal, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpRequestService } from '../../services/http-request.service';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

interface StudyDay {
  day: number;
  topic: string;
  activities: string[];
  icCompleted?: boolean;
  activityStatuses?: boolean[];
}

@Component({
  selector: 'app-study-plans',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './study-plans.html',
  styleUrl: './study-plans.scss',
})
export class StudyPlansComponent {
  private httpService = inject(HttpRequestService);
  private router = inject(Router);

  plans = signal<any[]>([]);
  loading = signal<boolean>(false);

  selectedPlanId = signal<number | null>(null);
  selectedPlanData = signal<StudyDay[]>([]);
  selectedDocFilename = signal<string>('');

  activeDayIndex = signal<number>(0);

  currentDayData = computed(() => {
    const data = this.selectedPlanData();
    const index = this.activeDayIndex();
    return data[index] || null;
  });

  constructor() {
    this.loadPlans();
  }

  loadPlans() {
    this.httpService.getStudyPlansRequest()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          this.plans.set(data);
        },
        error: (err) => {
          console.error("Failed to load plans", err);
        }
      });
  }

  selectPlan(doc: any) {
    this.selectedPlanId.set(doc.id);
    this.selectedDocFilename.set(doc.filename);
    this.loading.set(true);

    this.httpService.getStudyPlanRequest(doc.id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.selectedPlanData.set(res.plan);
          this.activeDayIndex.set(0);
        },
        error: (err) => {
          console.error("No plan found", err);
          this.selectedPlanData.set([]);
        }
      });
  }

  selectDay(index: number) {
    this.activeDayIndex.set(index);
  }

  startQuiz() {
    const docId = this.selectedPlanId();
    if (docId) this.router.navigate(['/quizzes']);
  }

  startFlashcards() {
    const docId = this.selectedPlanId();
    if (docId) this.router.navigate(['/flashcards']);
  }

  generatePlan() {
    const docId = this.selectedPlanId();
    if (!docId) return;

    this.loading.set(true);

    this.httpService.createStudyPlanRequest(docId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.selectedPlanData.set(res.plan);
          this.loadPlans();
        },
        error: (err) => {
          alert(`Failed to generate plan for ${docId}`);
        }
      })
  }

  toggleActivity(dayIndex: number, activityIndex: number, event: any) {
    const isChecked = event.target.checked;
    const currentPlan = this.selectedPlanData();

    const updatedPlan = JSON.parse(JSON.stringify(currentPlan));

    if (!updatedPlan[dayIndex].activityStatuses) {
      updatedPlan[dayIndex].activityStatuses = new Array(updatedPlan[dayIndex].activities.length).fill(false);
    }

    updatedPlan[dayIndex].activityStatuses[activityIndex] = isChecked;

    this.selectedPlanData.set(updatedPlan);

    const docId = this.selectedPlanId();
    if (docId) {
      this.httpService.updatePlanRequest(docId, updatedPlan).subscribe({
        next: () => console.log('Progress saved!'),
        error: (err) => console.error('Failed to save progress', err)
      });
    }
  }
}


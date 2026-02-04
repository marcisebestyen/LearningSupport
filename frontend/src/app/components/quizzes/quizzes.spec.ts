import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Quizzes } from './quizzes';

describe('Quizzes', () => {
  let component: Quizzes;
  let fixture: ComponentFixture<Quizzes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Quizzes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Quizzes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

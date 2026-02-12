import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudyPlans } from './study-plans';

describe('StudyPlans', () => {
  let component: StudyPlans;
  let fixture: ComponentFixture<StudyPlans>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudyPlans]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudyPlans);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlashcardPlayerComponent } from './flashcard-player';

describe('FlashcardPlayer', () => {
  let component: FlashcardPlayerComponent;
  let fixture: ComponentFixture<FlashcardPlayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlashcardPlayerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FlashcardPlayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

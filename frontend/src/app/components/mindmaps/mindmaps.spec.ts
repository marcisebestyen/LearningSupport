import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Mindmaps } from './mindmaps';

describe('Mindmaps', () => {
  let component: Mindmaps;
  let fixture: ComponentFixture<Mindmaps>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Mindmaps]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Mindmaps);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

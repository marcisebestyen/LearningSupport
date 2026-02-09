import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Essays } from './essays';

describe('Essays', () => {
  let component: Essays;
  let fixture: ComponentFixture<Essays>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Essays]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Essays);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

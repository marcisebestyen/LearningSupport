import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MindmapPlayer } from './mindmap-player';

describe('MindmapPlayer', () => {
  let component: MindmapPlayer;
  let fixture: ComponentFixture<MindmapPlayer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MindmapPlayer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MindmapPlayer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

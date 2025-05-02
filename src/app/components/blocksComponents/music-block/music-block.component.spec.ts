import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MusicBlockComponent } from './music-block.component';

describe('MusicBlockComponent', () => {
  let component: MusicBlockComponent;
  let fixture: ComponentFixture<MusicBlockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MusicBlockComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MusicBlockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

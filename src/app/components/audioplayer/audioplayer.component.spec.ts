import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AudioplayerComponent } from './audioplayer.component';

describe('AudioplayerComponent', () => {
  let component: AudioplayerComponent;
  let fixture: ComponentFixture<AudioplayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AudioplayerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AudioplayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

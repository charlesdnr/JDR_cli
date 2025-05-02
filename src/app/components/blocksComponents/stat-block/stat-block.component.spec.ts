import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatBlockComponent } from './stat-block.component';

describe('StatBlockComponent', () => {
  let component: StatBlockComponent;
  let fixture: ComponentFixture<StatBlockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatBlockComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StatBlockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

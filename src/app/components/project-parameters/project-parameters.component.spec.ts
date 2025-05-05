import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectParametersComponent } from './project-parameters.component';

describe('ProjectParametersComponent', () => {
  let component: ProjectParametersComponent;
  let fixture: ComponentFixture<ProjectParametersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectParametersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectParametersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

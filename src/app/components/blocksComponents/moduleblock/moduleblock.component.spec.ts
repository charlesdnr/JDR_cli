import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModuleblockComponent } from './moduleblock.component';

describe('ModuleblockComponent', () => {
  let component: ModuleblockComponent;
  let fixture: ComponentFixture<ModuleblockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModuleblockComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModuleblockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

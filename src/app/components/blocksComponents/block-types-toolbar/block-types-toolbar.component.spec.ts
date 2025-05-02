import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlockTypesToolbarComponent } from './block-types-toolbar.component';

describe('BlockTypesToolbarComponent', () => {
  let component: BlockTypesToolbarComponent;
  let fixture: ComponentFixture<BlockTypesToolbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlockTypesToolbarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BlockTypesToolbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

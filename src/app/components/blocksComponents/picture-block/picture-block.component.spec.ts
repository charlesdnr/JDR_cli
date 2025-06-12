import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PictureBlockComponent } from './picture-block.component';

describe('PictureBlockComponent', () => {
  let component: PictureBlockComponent;
  let fixture: ComponentFixture<PictureBlockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PictureBlockComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PictureBlockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

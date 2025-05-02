import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserAvatarChooseComponent } from './user-avatar-choose.component';

describe('UserAvatarChooseComponent', () => {
  let component: UserAvatarChooseComponent;
  let fixture: ComponentFixture<UserAvatarChooseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserAvatarChooseComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserAvatarChooseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

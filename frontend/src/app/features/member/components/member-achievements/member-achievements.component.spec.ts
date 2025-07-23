import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberAchievementsComponent } from './member-achievements.component';

describe('MemberAchievementsComponent', () => {
  let component: MemberAchievementsComponent;
  let fixture: ComponentFixture<MemberAchievementsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberAchievementsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MemberAchievementsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

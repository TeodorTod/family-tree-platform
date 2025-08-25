import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberStoriesComponent } from './member-stories.component';

describe('MemberStoriesComponent', () => {
  let component: MemberStoriesComponent;
  let fixture: ComponentFixture<MemberStoriesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberStoriesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MemberStoriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

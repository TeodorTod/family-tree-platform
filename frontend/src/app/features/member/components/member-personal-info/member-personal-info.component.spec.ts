import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberPersonalInfoComponent } from './member-personal-info.component';

describe('MemberPersonalInfoComponent', () => {
  let component: MemberPersonalInfoComponent;
  let fixture: ComponentFixture<MemberPersonalInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberPersonalInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MemberPersonalInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

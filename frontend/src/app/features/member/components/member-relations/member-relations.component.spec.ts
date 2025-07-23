import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberRelationsComponent } from './member-relations.component';

describe('MemberRelationsComponent', () => {
  let component: MemberRelationsComponent;
  let fixture: ComponentFixture<MemberRelationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberRelationsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MemberRelationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

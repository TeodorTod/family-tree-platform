import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberFavoritesComponent } from './member-favorites.component';

describe('MemberFavoritesComponent', () => {
  let component: MemberFavoritesComponent;
  let fixture: ComponentFixture<MemberFavoritesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberFavoritesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MemberFavoritesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

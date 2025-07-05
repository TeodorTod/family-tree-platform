import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaternalGrandparentsComponent } from './maternal-grandparents.component';

describe('MaternalGrandparentsComponent', () => {
  let component: MaternalGrandparentsComponent;
  let fixture: ComponentFixture<MaternalGrandparentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaternalGrandparentsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MaternalGrandparentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

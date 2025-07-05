import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaternalGrandparentsComponent } from './paternal-grandparents.component';

describe('PaternalGrandparentsComponent', () => {
  let component: PaternalGrandparentsComponent;
  let fixture: ComponentFixture<PaternalGrandparentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaternalGrandparentsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaternalGrandparentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

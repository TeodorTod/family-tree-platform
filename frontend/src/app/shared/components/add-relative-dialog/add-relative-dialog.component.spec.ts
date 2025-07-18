import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddRelativeDialogComponent } from './add-relative-dialog.component';

describe('AddRelativeDialogComponent', () => {
  let component: AddRelativeDialogComponent;
  let fixture: ComponentFixture<AddRelativeDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddRelativeDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddRelativeDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

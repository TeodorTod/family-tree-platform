import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BackgroundPickerDialogComponent } from './background-picker-dialog.component';

describe('BackgroundPickerDialogComponent', () => {
  let component: BackgroundPickerDialogComponent;
  let fixture: ComponentFixture<BackgroundPickerDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BackgroundPickerDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BackgroundPickerDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

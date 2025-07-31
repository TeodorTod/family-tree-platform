import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CONSTANTS } from '../../../../shared/constants/constants';
import { SHARED_ANGULAR_IMPORTS } from '../../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../../shared/imports/shared-primeng-imports';


@Component({
  selector: 'app-photo-picker-dialog',
  standalone: true,
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './photo-picker-dialog.component.html',
  styleUrls: ['./photo-picker-dialog.component.scss'],
})
export class PhotoPickerDialogComponent {
  @Input() visible: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() photoSelected = new EventEmitter<string>();
  CONSTANTS = CONSTANTS;

  availablePhotos = [
    'assets/images/user-image/user1.svg',
    'assets/images/user-image/user2.svg',
    'assets/images/user-image/user3.svg',
    'assets/images/user-image/user4.svg',
  ];

  selectedPhoto: string | null = null;

  selectPhoto(photo: string) {
    this.selectedPhoto = photo;
  }

  save() {
    if (this.selectedPhoto) {
      this.photoSelected.emit(this.selectedPhoto);
    }
    this.close.emit();
  }

  cancel() {
    this.close.emit();
  }
}
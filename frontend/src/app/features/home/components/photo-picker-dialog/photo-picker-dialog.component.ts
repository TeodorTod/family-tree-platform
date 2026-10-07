import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CONSTANTS } from '../../../../shared/constants/constants';
import { SHARED_ANGULAR_IMPORTS } from '../../../../shared/imports/shared-angular-imports';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';


@Component({
  selector: 'app-photo-picker-dialog',
  imports: [...SHARED_ANGULAR_IMPORTS, DialogModule, ButtonModule],
  templateUrl: './photo-picker-dialog.component.html',
  styleUrls: ['./photo-picker-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotoPickerDialogComponent {
  visible = input(false);
  close = output<void>();
  photoSelected = output<string>();
  CONSTANTS = CONSTANTS;

  // The public source build intentionally ships without bundled avatar assets.
  availablePhotos: string[] = [];

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

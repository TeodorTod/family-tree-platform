import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SHARED_ANGULAR_IMPORTS } from '../../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../../shared/imports/shared-primeng-imports';
import { CONSTANTS } from '../../../../shared/constants/constants';
import { BACKGROUND_IMAGES } from '../../../../shared/constants/background-images';

@Component({
  selector: 'app-background-picker-dialog',
  standalone: true,
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './background-picker-dialog.component.html',
  styleUrls: ['./background-picker-dialog.component.scss'],
})
export class BackgroundPickerDialogComponent {
  @Input() visible = false;
  @Output() close = new EventEmitter<void>();
  @Output() backgroundSelected = new EventEmitter<string>();

  CONSTANTS = CONSTANTS;

  backgroundImages = BACKGROUND_IMAGES;

  selectedBg: string | null = null;

  selectBg(bg: string) {
    this.selectedBg = bg;
  }

  save() {
    if (this.selectedBg) {
      localStorage.setItem('selectedBackground', this.selectedBg);
      this.backgroundSelected.emit(this.selectedBg);
    }
    this.close.emit();
  }

  cancel() {
    this.close.emit();
  }
}

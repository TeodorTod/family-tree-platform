import { ChangeDetectionStrategy, Component, EventEmitter, input, output } from '@angular/core';
import { SHARED_ANGULAR_IMPORTS } from '../../../../shared/imports/shared-angular-imports';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { CONSTANTS } from '../../../../shared/constants/constants';
import { BACKGROUND_IMAGES } from '../../../../shared/constants/background-images';

@Component({
  selector: 'app-background-picker-dialog',
  imports: [...SHARED_ANGULAR_IMPORTS, DialogModule, ButtonModule],
  templateUrl: './background-picker-dialog.component.html',
  styleUrls: ['./background-picker-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackgroundPickerDialogComponent {
  visible = input(false);
  close = output<void>();
  backgroundSelected = output<string>();

  CONSTANTS = CONSTANTS;

  backgroundImages = BACKGROUND_IMAGES;

  selectedBg: string | null = null;

  selectBg(bg: string) {
    this.selectedBg = bg;
  }

  save() {
    const bg = this.selectedBg;
    if (!bg) {
      this.close.emit();
      return;
    }
    localStorage.setItem('selectedBackground', bg);
    this.backgroundSelected.emit(bg);
    this.close.emit();
  }

  cancel() {
    this.close.emit();
  }
}

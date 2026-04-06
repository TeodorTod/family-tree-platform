import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { SHARED_ANGULAR_IMPORTS } from '../../../../shared/imports/shared-angular-imports';
import { ButtonModule } from 'primeng/button';
import { SliderModule } from 'primeng/slider';
import { SliderChangeEvent } from 'primeng/types/slider';
import { TooltipModule } from 'primeng/tooltip';
import { CONSTANTS } from '../../../../shared/constants/constants';

@Component({
  selector: 'app-home-control-panel',
  imports: [
    ...SHARED_ANGULAR_IMPORTS,
    ButtonModule,
    TooltipModule,
    SliderModule,
  ],
  templateUrl: './home-control-panel.component.html',
  styleUrls: ['./home-control-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeControlPanelComponent {
  constants = CONSTANTS;

  showTableView = input(false);
  soundConsent = input(false);
  soundPlaying = input(false);
  showConnections = input(false);
  showBirthInfo = input(true);
  treeInvertVertical = input(false);
  circleSizeValue = input(80);
  textSizeValue = input(14);
  backgroundOpacityValue = input(0.6);
  distanceBoostXValue = input(1.6);
  distanceBoostYValue = input(1);

  viewToggled = output<void>();
  soundToggled = output<void>();
  exportRequested = output<void>();
  zoomInRequested = output<void>();
  zoomOutRequested = output<void>();
  backgroundDialogRequested = output<void>();
  photoDialogRequested = output<void>();
  connectionsToggled = output<void>();
  birthInfoToggled = output<void>();
  treeInvertToggled = output<void>();
  circleSizeChanged = output<number>();
  textSizeChanged = output<number>();
  backgroundOpacityChanged = output<number>();
  distanceBoostXChanged = output<number>();
  distanceBoostYChanged = output<number>();

  /** Use onChange instead of ngModelChange so layout/CD (e.g. modal open) does not echo bogus values to parent. */
  onBackgroundOpacityChange(ev: SliderChangeEvent): void {
    const v = ev.value;
    if (v === undefined || !Number.isFinite(v)) return;
    this.backgroundOpacityChanged.emit(v);
  }
}

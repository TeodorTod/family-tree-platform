import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { SHARED_ANGULAR_IMPORTS } from '../../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../../shared/imports/shared-primeng-imports';
import { CONSTANTS } from '../../../../shared/constants/constants';

@Component({
  selector: 'app-home-control-panel',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
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
  circleSizeValue = input(80);
  textSizeValue = input(14);
  backgroundOpacityValue = input(0.6);

  viewToggled = output<void>();
  soundToggled = output<void>();
  exportRequested = output<void>();
  zoomInRequested = output<void>();
  zoomOutRequested = output<void>();
  backgroundDialogRequested = output<void>();
  photoDialogRequested = output<void>();
  connectionsToggled = output<void>();
  birthInfoToggled = output<void>();
  circleSizeChanged = output<number>();
  textSizeChanged = output<number>();
  backgroundOpacityChanged = output<number>();
}

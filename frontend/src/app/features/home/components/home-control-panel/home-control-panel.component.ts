import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { SHARED_ANGULAR_IMPORTS } from '../../../../shared/imports/shared-angular-imports';
import { ButtonModule } from 'primeng/button';
import { SliderModule } from 'primeng/slider';
import { SliderChangeEvent } from 'primeng/types/slider';
import { TooltipModule } from 'primeng/tooltip';
import { CONSTANTS } from '../../../../shared/constants/constants';

const LS_CHART_TOOLS_OPEN = 'homeControlPanel.chartToolsOpen';

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
  host: {
    '[class.control-panel--chart-collapsed]': '!showTableView() && !chartToolsOpen()',
  },
})
export class HomeControlPanelComponent {
  constants = CONSTANTS;
  private platformId = inject(PLATFORM_ID);

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

  chartToolsOpen = signal(this.readChartToolsOpenFromStorage());
  layoutAccordionExpanded: string[] = [];

  constructor() {
    effect(() => {
      const open = this.chartToolsOpen();
      if (!isPlatformBrowser(this.platformId)) return;
      try {
        localStorage.setItem(LS_CHART_TOOLS_OPEN, JSON.stringify(open));
      } catch {
        /* ignore quota / private mode */
      }
    });
  }

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

  toggleChartTools(): void {
    this.chartToolsOpen.update((v) => !v);
  }

  private readChartToolsOpenFromStorage(): boolean {
    if (!isPlatformBrowser(this.platformId)) return true;
    try {
      const raw = localStorage.getItem(LS_CHART_TOOLS_OPEN);
      if (raw === null) return true;
      return JSON.parse(raw) === true;
    } catch {
      return true;
    }
  }

  /** Use onChange instead of ngModelChange so layout/CD (e.g. modal open) does not echo bogus values to parent. */
  onBackgroundOpacityChange(ev: SliderChangeEvent): void {
    const v = ev.value;
    if (v === undefined || !Number.isFinite(v)) return;
    this.backgroundOpacityChanged.emit(v);
  }
}

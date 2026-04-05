import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { SHARED_ANGULAR_IMPORTS } from '../../../../shared/imports/shared-angular-imports';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { CONSTANTS } from '../../../../shared/constants/constants';

@Component({
  selector: 'app-export-overlay',
  imports: [...SHARED_ANGULAR_IMPORTS, ButtonModule, TooltipModule],
  templateUrl: './export-overlay.component.html',
  styleUrls: ['./export-overlay.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportOverlayComponent {
  constants = CONSTANTS;

  exportBuilding = input(false);
  exportDataUrl = input<string | null>(null);
  exportMeta = input<{ width: number; height: number } | null>(null);

  nudgeBg = output<{ dx: number; dy: number }>();
  resetBg = output<void>();
  refreshPreview = output<void>();
  downloadPng = output<void>();
  downloadPdf = output<void>();
  close = output<void>();

  bgDragStart = output<MouseEvent | TouchEvent>();
  bgDragMove = output<MouseEvent | TouchEvent>();
  bgDragEnd = output<void>();

  onNudge(dx: number, dy: number): void {
    this.nudgeBg.emit({ dx, dy });
  }

  onResetBg(): void {
    this.resetBg.emit();
  }
}

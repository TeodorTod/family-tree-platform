import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LoadingService } from '../../services/loading.service';
import { SHARED_PRIMENG_IMPORTS } from '../../../shared/imports/shared-primeng-imports';

@Component({
  selector: 'app-loading-overlay',
  imports: [...SHARED_PRIMENG_IMPORTS],
  templateUrl: './loading-overlay.component.html',
  styleUrl: './loading-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingOverlayComponent {
  private loadingService = inject(LoadingService);
  readonly loading = this.loadingService.isLoading;
}

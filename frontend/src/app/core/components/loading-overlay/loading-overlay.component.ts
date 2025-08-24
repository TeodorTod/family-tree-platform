import { Component, inject } from '@angular/core';
import { LoadingService } from '../../services/loading.service';
import { SHARED_PRIMENG_IMPORTS } from '../../../shared/imports/shared-primeng-imports';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-loading-overlay',
  imports: [...SHARED_PRIMENG_IMPORTS, AsyncPipe, ],
  templateUrl: './loading-overlay.component.html',
  styleUrl: './loading-overlay.component.scss',
})
export class LoadingOverlayComponent {
  private loading = inject(LoadingService);
  loading$ = this.loading.loading$;
}

import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private pending = 0;
  private readonly loading = signal(false);
  readonly isLoading = this.loading.asReadonly();

  show(): void {
    this.pending++;
    if (this.pending === 1) this.loading.set(true);
  }

  hide(): void {
    if (this.pending > 0) this.pending--;
    if (this.pending === 0) this.loading.set(false);
  }

  reset(): void {
    this.pending = 0;
    this.loading.set(false);
  }
}

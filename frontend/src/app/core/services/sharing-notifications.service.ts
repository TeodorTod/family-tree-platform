import { Injectable, computed, inject, signal } from '@angular/core';
import { take } from 'rxjs';
import { ShareRequestCounters, SharingApiService } from './sharing-api.service';

@Injectable({ providedIn: 'root' })
export class SharingNotificationsService {
  private api = inject(SharingApiService);
  private counters = signal<ShareRequestCounters>({ incomingPending: 0, outgoingDecided: 0 });

  readonly countersSignal = this.counters.asReadonly();
  readonly totalPending = computed(() => {
    const c = this.counters();
    return c.incomingPending + c.outgoingDecided;
  });

  refresh() {
    this.api
      .getRequestCounters()
      .pipe(take(1))
      .subscribe({
        next: (res) => this.counters.set(res),
        error: () => this.reset(),
      });
  }

  reset() {
    this.counters.set({ incomingPending: 0, outgoingDecided: 0 });
  }
}

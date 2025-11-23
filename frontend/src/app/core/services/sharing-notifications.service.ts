import { Injectable, computed, inject, signal } from '@angular/core';
import { take } from 'rxjs';
import { ShareRequestCounters, SharingApiService } from './sharing-api.service';
import { ShareRequestTab } from '../../shared/enums/share-request-tab.enum';

@Injectable({ providedIn: 'root' })
export class SharingNotificationsService {
  private api = inject(SharingApiService);
  private counters = signal<ShareRequestCounters>({
    incomingPending: 0,
    outgoingDecided: 0,
    outgoingUnseen: 0,
  });

  readonly countersSignal = this.counters.asReadonly();
  readonly totalPending = computed(() => {
    const counters = this.counters();
    return counters.incomingPending + this.currentOutgoingUnseen(counters);
  });
  readonly preferredTab = computed<ShareRequestTab>(() => {
    const counters = this.counters();
    if (counters.incomingPending > 0) {
      return ShareRequestTab.Incoming;
    }
    if (this.currentOutgoingUnseen(counters) > 0) {
      return ShareRequestTab.Outgoing;
    }
    return ShareRequestTab.Incoming;
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

  markTabViewed(tab: ShareRequestTab) {
    if (tab === ShareRequestTab.Outgoing) {
      this.api
        .markOutgoingViewed()
        .pipe(take(1))
        .subscribe({
          next: () =>
            this.counters.update((current) => ({
              ...current,
              outgoingUnseen: 0,
            })),
          error: () => void 0,
        });
    }
  }

  reset() {
    this.counters.set({
      incomingPending: 0,
      outgoingDecided: 0,
      outgoingUnseen: 0,
    });
  }

  private currentOutgoingUnseen(counters: ShareRequestCounters) {
    const fromApi =
      typeof counters.outgoingUnseen === 'number'
        ? counters.outgoingUnseen
        : counters.outgoingDecided ?? 0;
    return Math.max(fromApi, 0);
  }
}

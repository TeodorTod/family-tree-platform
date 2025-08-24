import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private pending = 0;
  private _loading$ = new BehaviorSubject<boolean>(false);
  readonly loading$ = this._loading$.asObservable();

  show(): void {
    this.pending++;
    if (this.pending === 1) this._loading$.next(true);
  }

  hide(): void {
    if (this.pending > 0) this.pending--;
    if (this.pending === 0) this._loading$.next(false);
  }

  reset(): void {
    this.pending = 0;
    this._loading$.next(false);
  }
}

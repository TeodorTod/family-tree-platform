import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface CreateDonationCheckoutSessionDto {
  amount: number;
  currency: string;
  provider: 'stripe';
  successUrl: string;
  cancelUrl: string;
  note?: string | null;
}

export interface DonationCheckoutSessionResponse {
  sessionId: string;
}

@Injectable({ providedIn: 'root' })
export class SupportApiService {
  private http = inject(HttpClient);

  createDonationCheckoutSession(payload: CreateDonationCheckoutSessionDto) {
    return this.http.post<DonationCheckoutSessionResponse>(
      `${environment.apiUrl}/billing/donations/checkout-session`,
      payload,
      { withCredentials: true },
    );
  }
}

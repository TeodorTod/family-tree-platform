import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import {
  AdminMemberDetail,
  AdminUserSummary,
} from '../models/admin.models';
import { SubscriptionPlanCode } from '../../../shared/types/subscription-plan.type';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin`;

  getUsers() {
    return this.http.get<AdminUserSummary[]>(`${this.baseUrl}/users`, {
      withCredentials: true,
    });
  }

  getMembers(userId: string) {
    return this.http.get<AdminMemberDetail[]>(
      `${this.baseUrl}/users/${userId}/members`,
      { withCredentials: true },
    );
  }

  updateUserSubscription(userId: string, plan: SubscriptionPlanCode) {
    return this.http.patch<AdminUserSummary>(
      `${this.baseUrl}/users/${userId}/subscription`,
      { plan },
      { withCredentials: true },
    );
  }
}

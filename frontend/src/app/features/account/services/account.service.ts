import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthUser } from '../../../shared/models/user.model';
import { Lang } from '../../../shared/types/lang.type';

export interface UpdateProfilePayload {
  displayName?: string | null;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

@Injectable({ providedIn: 'root' })
export class AccountService {
  private http = inject(HttpClient);

  getProfile() {
    return this.http.get<AuthUser>(`${environment.apiUrl}/auth/me`, {
      withCredentials: true,
    });
  }

  updateProfile(payload: UpdateProfilePayload) {
    return this.http.patch<AuthUser>(`${environment.apiUrl}/auth/profile`, payload, {
      withCredentials: true,
    });
  }

  changePassword(payload: ChangePasswordPayload) {
    return this.http.post<{ ok: boolean }>(
      `${environment.apiUrl}/auth/change-password`,
      payload,
      { withCredentials: true },
    );
  }

  updateLanguage(language: Lang) {
    return this.http.patch<{ language: Lang }>(
      `${environment.apiUrl}/auth/language`,
      { language },
      { withCredentials: true },
    );
  }
}

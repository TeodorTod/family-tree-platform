import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { MemberProfile } from '../../shared/models/member-profile.model';

@Injectable({ providedIn: 'root' })
export class MemberProfileService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  getProfileByRole(role: string): Observable<MemberProfile | null> {
    return this.http.get<MemberProfile | null>(
      `${this.api}/member-profiles/${role}`
    );
  }

  createProfileByRole(role: string, data: MemberProfile) {
    return this.http.post<MemberProfile>(
      `${this.api}/member-profiles/${role}`,
      data
    );
  }

  updateProfileByRole(role: string, data: Partial<MemberProfile>) {
    return this.http.put<MemberProfile>(
      `${this.api}/member-profiles/${role}`,
      data
    );
  }

  saveProfileByRole(
    role: string,
    data: MemberProfile
  ): Observable<MemberProfile> {
    return new Observable<MemberProfile>((observer) => {
      this.updateProfileByRole(role, data).subscribe({
        next: (res) => observer.next(res),
        error: () => {
          this.createProfileByRole(role, data).subscribe({
            next: (res) => observer.next(res),
            error: (err) => observer.error(err),
          });
        },
      });
    });
  }
}

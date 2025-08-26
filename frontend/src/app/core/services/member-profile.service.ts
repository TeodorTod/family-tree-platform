import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, shareReplay, tap } from 'rxjs';
import { MemberProfile } from '../../shared/models/member-profile.model';

type UpsertPayload = Partial<
  Pick<
    MemberProfile,
    | 'bio'
    | 'coverMediaUrl'
    | 'achievements'
    | 'facts'
    | 'favorites'
    | 'education'
    | 'work'
    | 'personalInfo'
    | 'stories'
    | 'notes'
  >
>;

@Injectable({ providedIn: 'root' })
export class MemberProfileService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;
  private profileCache = new Map<string, Observable<MemberProfile | null>>();

  getProfileByRole(role: string): Observable<MemberProfile | null> {
    const key = role.toLowerCase();
    if (!this.profileCache.has(key)) {
      const obs = this.http
        .get<MemberProfile | null>(`${this.api}/member-profiles/${role}`)
        .pipe(shareReplay(1));
      this.profileCache.set(key, obs);
    }
    return this.profileCache.get(key)!;
  }

  createProfileByRole(role: string, data: Partial<MemberProfile>) {
    return this.http.post<MemberProfile>(
      `${this.api}/member-profiles/${role}`,
      this.clean(data)
    );
  }

  updateProfileByRole(role: string, data: Partial<MemberProfile>) {
    return this.http.put<MemberProfile>(
      `${this.api}/member-profiles/${role}`,
      this.clean(data)
    );
  }

  saveProfileByRole(role: string, data: Partial<MemberProfile>) {
    return this.http
      .put<MemberProfile>(
        `${this.api}/member-profiles/${role}`,
        this.clean(data)
      )
      .pipe(tap(() => this.profileCache.delete(role.toLowerCase())));
  }

  private clean(data: Partial<MemberProfile>): UpsertPayload {
    const {
      bio,
      coverMediaUrl,
      achievements,
      facts,
      favorites,
      education,
      work,
      personalInfo,
      stories,
      notes,
    } = data ?? {};

    const payload: UpsertPayload = {
      bio,
      coverMediaUrl,
      achievements,
      facts,
      favorites,
      education,
      work,
      personalInfo,
      stories,
      notes,
    };

    return Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== undefined)
    ) as UpsertPayload;
  }
}

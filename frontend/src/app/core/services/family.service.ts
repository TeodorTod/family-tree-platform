import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { FamilyMember } from '../../shared/models/family-member.model';

@Injectable({
  providedIn: 'root',
})
export class FamilyService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  getMyFamily(): Observable<FamilyMember[]> {
    return this.http.get<FamilyMember[]>(`${this.api}/family-members/my`);
  }

  createFamilyMember(data: FamilyMember) {
    return this.http.post(`${this.api}/family-members`, data);
  }

  upsertFamilyMember(data: FamilyMember) {
    return this.http.post(`${this.api}/family-members/upsert`, data);
  }

  getFamilyMemberByRole(role: string): Observable<FamilyMember> {
    return this.http.get<FamilyMember>(`${this.api}/family-members/${role}`);
  }

  createMemberByRole(role: string, data: FamilyMember) {
    return this.http.post(`${this.api}/family-members/${role}`, data);
  }

  updateMemberByRole(role: string, data: Partial<FamilyMember>) {
    return this.http.put(`${this.api}/family-members/${role}`, data);
  }

  /** Optional: auto fallback from PUT → POST if not found */
  saveMemberByRole(role: string, data: FamilyMember): Observable<any> {
    return new Observable((observer) => {
      this.updateMemberByRole(role, data).subscribe({
        next: (res) => observer.next(res),
        error: () => {
          this.createMemberByRole(role, data).subscribe({
            next: (res) => observer.next(res),
            error: (err) => observer.error(err),
          });
        },
      });
    });
  }

  uploadPhoto(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(
      `${this.api}/media/upload`,
      formData
    );
  }
}

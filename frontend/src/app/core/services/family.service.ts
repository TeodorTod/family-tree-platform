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

  getMyFamily(): Observable<FamilyMember[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/family-members/my`);
  }

  createFamilyMember(data: any) {
    return this.http.post(`${environment.apiUrl}/family-members`, data);
  }

  uploadPhoto(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(
      `${environment.apiUrl}/media/upload`,
      formData
    );
  }
}

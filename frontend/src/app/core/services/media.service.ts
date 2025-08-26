// src/app/core/services/media.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MediaService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  upload(file: File): Observable<{ url: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ url: string }>(`${this.api}/media/upload`, fd);
  }

  uploadForMember(memberId: string, file: File): Observable<{ url: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ url: string }>(`${this.api}/member-profiles/${memberId}/upload`, fd);
  }
}

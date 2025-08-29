import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { forkJoin, map, Observable, of } from 'rxjs';
import { MediaItem } from '../../shared/models/media-item.model';

@Injectable({ providedIn: 'root' })
export class MediaService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  upload(file: File): Observable<{ url: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ url: string }>(`${this.api}/media/upload`, fd);
  }

  uploadForMember(memberId: string, file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ url: string }>(
      `${this.api}/media/member/${memberId}/upload`,
      fd
    );
  }

  listByMember(memberId: string): Observable<MediaItem[]> {
    return this.http.get<MediaItem[]>(`${this.api}/media/member/${memberId}`);
  }

  uploadManyForMember(memberId: string, files: File[]): Observable<void> {
    if (!files?.length) return of(void 0);
    const reqs = files.map((f) => {
      const fd = new FormData();
      fd.append('file', f);
      return this.http.post(`${this.api}/media/member/${memberId}/upload`, fd);
    });
    return forkJoin(reqs).pipe(map(() => void 0));
  }

  // Streaming endpoint for local files by path
  streamUrlForPath(absPath: string): string {
    const p = encodeURIComponent(absPath);
    return `${this.api}/media/stream?path=${p}`;
  }

  deleteManyForMember(memberId: string, urls: string[]) {
    // Adjust the endpoint to whatever your backend exposes.
    // POST is used here because many backends avoid DELETE with a body.
    return this.http.post<void>(
      `${this.api}/media/member/${memberId}/delete-many`,
      { urls }
    );
  }
}

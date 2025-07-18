import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { FamilyMember } from '../../shared/models/family-member.model';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';

@Injectable({
  providedIn: 'root',
})
export class FamilyService {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private api = environment.apiUrl;

  createFamilyMemberForm(): FormGroup<{
    firstName: FormControl<string | null>;
    middleName: FormControl<string | null>;
    lastName: FormControl<string | null>;
    gender: FormControl<string | null>;
    dob: FormControl<Date | null>;
    dod: FormControl<Date | null>;
    isAlive: FormControl<boolean | null>;
  }> {
    return this.fb.group({
      firstName: new FormControl<string | null>(null, Validators.required),
      middleName: new FormControl<string | null>(null),
      lastName: new FormControl<string | null>(null, Validators.required),
      gender: new FormControl<string | null>(null),
      dob: new FormControl<Date | null>(null, Validators.required),
      dod: new FormControl<Date | null>(null),
      isAlive: new FormControl<boolean | null>(true, Validators.required),
    });
  }

  getMyFamily(): Observable<FamilyMember[]> {
    return this.http.get<FamilyMember[]>(`${this.api}/family-members/my-tree`);
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

  createRelationship(data: {
    fromMemberId: string;
    toMemberId: string;
    type: string;
  }) {
    return this.http.post(`${this.api}/family-members/relationships`, data);
  }
}

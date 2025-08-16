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
import { PartnerStatus } from '../../shared/enums/partner-status.enum';

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
  dobMode: FormControl<'exact' | 'year' | 'note'>;
  dob: FormControl<Date | null>;
  birthYear: FormControl<number | null>;
  birthNote: FormControl<string | null>;
  dod: FormControl<Date | null>;
  isAlive: FormControl<boolean | null>;
  translatedRole: FormControl<string | null>;
}> {
  const fg = this.fb.group({
    firstName: new FormControl<string | null>(null, Validators.required),
    middleName: new FormControl<string | null>(null),
    lastName: new FormControl<string | null>(null, Validators.required),
    gender: new FormControl<string | null>(null),

    dobMode: new FormControl<'exact' | 'year' | 'note'>('exact', { nonNullable: true }),
    dob: new FormControl<Date | null>(null),
    birthYear: new FormControl<number | null>(null),   // numeric only (derived)
    birthNote: new FormControl<string | null>(null),

    dod: new FormControl<Date | null>(null),
    isAlive: new FormControl<boolean | null>(true, Validators.required),
    translatedRole: new FormControl<string | null>(null),
  });

  // switch validators per mode (use only `dob` for exact and year)
  fg.get('dobMode')!.valueChanges.subscribe((mode) => {
    const dob = fg.get('dob')!;
    const by  = fg.get('birthYear')!;
    const bn  = fg.get('birthNote')!;

    dob.clearValidators();
    by.clearValidators();
    bn.clearValidators();

    if (mode === 'exact') {
      dob.setValidators([]);                  // optional exact date
      by.setValue(null, { emitEvent: false }); // clear year
      bn.setValue(null, { emitEvent: false });
    } else if (mode === 'year') {
      dob.setValidators([Validators.required]); // pick a year (as Date Jan 1)
      by.setValue(null, { emitEvent: false });  // numeric gets derived below
      bn.setValue(null, { emitEvent: false });
    } else { // note
      bn.setValidators([Validators.maxLength(200)]);
      dob.setValue(null, { emitEvent: false });
      by.setValue(null, { emitEvent: false });
    }

    dob.updateValueAndValidity({ emitEvent: false });
    by.updateValueAndValidity({ emitEvent: false });
    bn.updateValueAndValidity({ emitEvent: false });
  });

  // when in "year" mode, keep birthYear = dob.getFullYear()
  fg.get('dob')!.valueChanges.subscribe((d: Date | null) => {
    if (fg.get('dobMode')!.value === 'year') {
      fg.get('birthYear')!.setValue(d ? d.getFullYear() : null, { emitEvent: false });
    }
  });

  return fg;
}

buildDobPayload(form: FormGroup<any>): {
  dob?: string | null;
  birthYear?: number | null;
  birthNote?: string | null;
} {
  const mode = form.get('dobMode')!.value as 'exact'|'year'|'note';
  const dob: Date | null = form.value.dob;

  if (mode === 'exact' && dob) {
    return { dob: new Date(dob).toISOString(), birthYear: null, birthNote: null };
  }
  if (mode === 'year' && dob) {
    return { dob: null, birthYear: dob.getFullYear(), birthNote: null };
  }
  if (mode === 'note' && form.value.birthNote) {
    return { dob: null, birthYear: null, birthNote: form.value.birthNote };
  }
  return { dob: null, birthYear: null, birthNote: null };
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

  getMyFamilyPaged(
    page: number,
    size: number,
    sortField: string,
    sortOrder: string
  ) {
    return this.http.get<{ data: FamilyMember[]; total: number }>(
      `${this.api}/family-members/my-tree-paged`,
      {
        params: {
          page,
          size,
          sortField,
          sortOrder,
        },
      }
    );
  }

  setPartner(
    memberId: string,
    partnerId: string,
    status: PartnerStatus = PartnerStatus.UNKNOWN
  ) {
    return this.http.post(`${this.api}/family-members/set-partner`, {
      memberId,
      partnerId,
      status,
    });
  }

  clearPartner(memberId: string) {
    return this.http.post(`${this.api}/family-members/clear-partner`, {
      memberId,
    });
  }
}

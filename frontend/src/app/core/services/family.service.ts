import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, shareReplay, switchMap, tap } from 'rxjs';
import { FamilyMember } from '../../shared/models/family-member.model';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { PartnerStatus } from '../../shared/enums/partner-status.enum';
import { CONSTANTS } from '../../shared/constants/constants';
import { BirthDeathDateMode } from '../../shared/enums/birth-death-date.enum';

@Injectable({
  providedIn: 'root',
})
export class FamilyService {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private api = environment.apiUrl;
  private memberByRoleCache = new Map<string, Observable<any>>();

  private roleKey(role: string) {
    return (role ?? '').toLowerCase();
  }
  private invalidateRoleCache(role: string) {
    this.memberByRoleCache.delete(this.roleKey(role));
  }

  private fetchByRoleDirect(role: string) {
    return this.http.get<any>(
      `${this.api}/${CONSTANTS.ROUTES.FAMILY_MEMBERS}/${role}`
    );
  }

  createFamilyMemberForm(): FormGroup<{
    firstName: FormControl<string | null>;
    middleName: FormControl<string | null>;
    lastName: FormControl<string | null>;
    gender: FormControl<string | null>;

    dobMode: FormControl<BirthDeathDateMode>;
    dob: FormControl<Date | null>;
    birthYear: FormControl<number | null>;
    birthYearDate: FormControl<Date | null>;
    birthNote: FormControl<string | null>;

    // death
    dodMode: FormControl<BirthDeathDateMode>;
    dod: FormControl<Date | null>;
    deathYear: FormControl<number | null>;
    deathYearDate: FormControl<Date | null>;
    deathNote: FormControl<string | null>;

    isAlive: FormControl<boolean | null>;
    translatedRole: FormControl<string | null>;
    partnerStatus: FormControl<PartnerStatus | null>;
  }> {
    const fg = this.fb.group({
      firstName: new FormControl<string | null>(null, Validators.required),
      middleName: new FormControl<string | null>(null),
      lastName: new FormControl<string | null>(null, Validators.required),
      gender: new FormControl<string | null>(null),

      // birth
      dobMode: new FormControl<BirthDeathDateMode>(BirthDeathDateMode.EXACT, {
        nonNullable: true,
      }),
      dob: new FormControl<Date | null>(null),
      birthYear: new FormControl<number | null>(null),
      birthYearDate: new FormControl<Date | null>(null),
      birthNote: new FormControl<string | null>(null),

      // death
      dodMode: new FormControl<BirthDeathDateMode>(BirthDeathDateMode.EXACT, {
        nonNullable: true,
      }),
      dod: new FormControl<Date | null>(null),
      deathYear: new FormControl<number | null>(null),
      deathYearDate: new FormControl<Date | null>(null),
      deathNote: new FormControl<string | null>(null),

      isAlive: new FormControl<boolean | null>(true, Validators.required),
      translatedRole: new FormControl<string | null>(null),
      partnerStatus: new FormControl<PartnerStatus | null>(null),
    });

    fg.get('dobMode')!.valueChanges.subscribe((mode) => {
      const dob = fg.get('dob')!;
      const by = fg.get('birthYear')!;
      const byDate = fg.get('birthYearDate')!;
      const bn = fg.get('birthNote')!;

      dob.clearValidators();
      by.clearValidators();
      bn.clearValidators();

      if (mode === BirthDeathDateMode.EXACT) {
        by.setValue(null, { emitEvent: false });
        byDate.setValue(null, { emitEvent: false });
        bn.setValue(null, { emitEvent: false });
      } else if (mode === BirthDeathDateMode.YEAR) {
        by.setValidators([Validators.min(1000), Validators.max(2100)]);
        dob.setValue(null, { emitEvent: false });
        bn.setValue(null, { emitEvent: false });
      } else {
        bn.setValidators([Validators.maxLength(200)]);
        dob.setValue(null, { emitEvent: false });
        by.setValue(null, { emitEvent: false });
        byDate.setValue(null, { emitEvent: false });
      }

      dob.updateValueAndValidity({ emitEvent: false });
      by.updateValueAndValidity({ emitEvent: false });
      bn.updateValueAndValidity({ emitEvent: false });
    });

    fg.get('birthYearDate')!.valueChanges.subscribe((d: Date | null) => {
      fg.get('birthYear')!.setValue(d ? d.getFullYear() : null, {
        emitEvent: false,
      });
    });

    const applyDodMode = () => {
      const mode = fg.get('dodMode')!.value;
      const dod = fg.get('dod')!;
      const dy = fg.get('deathYear')!;
      const dyDate = fg.get('deathYearDate')!;
      const dn = fg.get('deathNote')!;

      dod.clearValidators();
      dy.clearValidators();
      dn.clearValidators();

      if (mode === BirthDeathDateMode.EXACT) {
        dy.setValue(null, { emitEvent: false });
        dyDate.setValue(null, { emitEvent: false });
        dn.setValue(null, { emitEvent: false });
      } else if (mode === BirthDeathDateMode.YEAR) {
        dy.setValidators([Validators.min(1000), Validators.max(2100)]);
        dod.setValue(null, { emitEvent: false });
        dn.setValue(null, { emitEvent: false });
      } else {
        dn.setValidators([Validators.maxLength(200)]);
        dod.setValue(null, { emitEvent: false });
        dy.setValue(null, { emitEvent: false });
        dyDate.setValue(null, { emitEvent: false });
      }

      dod.updateValueAndValidity({ emitEvent: false });
      dy.updateValueAndValidity({ emitEvent: false });
      dn.updateValueAndValidity({ emitEvent: false });
    };

    fg.get('dodMode')!.valueChanges.subscribe(() => applyDodMode());

    fg.get('deathYearDate')!.valueChanges.subscribe((d: Date | null) => {
      fg.get('deathYear')!.setValue(d ? d.getFullYear() : null, {
        emitEvent: false,
      });
    });

    fg.get('isAlive')!.valueChanges.subscribe((alive) => {
      if (alive) {
        fg.patchValue(
          {
            dod: null,
            deathYear: null,
            deathYearDate: null,
            deathNote: null,
          },
          { emitEvent: false }
        );
      } else {
        applyDodMode();
      }
    });

    return fg;
  }

  buildDobPayload(form: FormGroup<any>): {
    dob?: string | null;
    birthYear?: number | null;
    birthNote?: string | null;
  } {
    const mode = form.get('dobMode')!.value as BirthDeathDateMode;
    const dob: Date | null = form.value.dob;

    if (mode === BirthDeathDateMode.EXACT && dob) {
      return {
        dob: new Date(dob).toISOString(),
        birthYear: null,
        birthNote: null,
      };
    }
    if (mode === BirthDeathDateMode.YEAR && dob) {
      return { dob: null, birthYear: dob.getFullYear(), birthNote: null };
    }
    if (mode === BirthDeathDateMode.NOTE && form.value.birthNote) {
      return { dob: null, birthYear: null, birthNote: form.value.birthNote };
    }
    return { dob: null, birthYear: null, birthNote: null };
  }

  buildDodPayload(form: FormGroup<any>): {
    dod?: string | null;
    deathYear?: number | null;
    deathNote?: string | null;
  } {
    if (form.value.isAlive) {
      return { dod: null, deathYear: null, deathNote: null };
    }
    const mode = form.get('dodMode')!.value as BirthDeathDateMode;
    if (mode === BirthDeathDateMode.EXACT && form.value.dod) {
      return {
        dod: new Date(form.value.dod).toISOString(),
        deathYear: null,
        deathNote: null,
      };
    }
    if (mode === 'year' && form.value.deathYear) {
      return {
        dod: null,
        deathYear: Number(form.value.deathYear),
        deathNote: null,
      };
    }
    if (mode === 'note' && form.value.deathNote) {
      return { dod: null, deathYear: null, deathNote: form.value.deathNote };
    }
    return { dod: null, deathYear: null, deathNote: null };
  }

  getMyFamily(opts?: {
    fields?: (keyof FamilyMember)[];
    with?: ('parentOf' | 'childOf' | 'media' | 'profile')[];
  }) {
    const params: Record<string, string> = {};
    if (opts?.fields?.length) params['fields'] = opts.fields.join(',');
    if (opts?.with?.length) params['with'] = opts.with.join(',');

    return this.http.get<Partial<FamilyMember>[]>(
      `${this.api}/${CONSTANTS.ROUTES.FAMILY_MEMBERS}/my-tree`,
      { params }
    );
  }

  getFamilyMemberById(
    id: string,
    opts?: {
      fields?: (keyof FamilyMember)[];
      with?: ('parentOf' | 'childOf' | 'media' | 'profile')[];
    }
  ) {
    const params: Record<string, string> = {};
    if (opts?.fields?.length) params['fields'] = opts.fields.join(',');
    if (opts?.with?.length) params['with'] = opts.with.join(',');

    return this.http.get<Partial<FamilyMember>>(
      `${this.api}/${CONSTANTS.ROUTES.FAMILY_MEMBERS}/by-id/${id}`,
      { params }
    );
  }

  createFamilyMember(data: FamilyMember) {
    return this.http.post(
      `${this.api}/${CONSTANTS.ROUTES.FAMILY_MEMBERS}`,
      data
    );
  }

  upsertFamilyMember(data: FamilyMember) {
    return this.http.post(
      `${this.api}/${CONSTANTS.ROUTES.FAMILY_MEMBERS}/upsert`,
      data
    );
  }

  getFamilyMemberByRole(role: string) {
    const key = this.roleKey(role);
    if (!this.memberByRoleCache.has(key)) {
      const obs = this.http
        .get<any>(`${this.api}/${CONSTANTS.ROUTES.FAMILY_MEMBERS}/${role}`)
        .pipe(shareReplay(1));
      this.memberByRoleCache.set(key, obs);
    }
    return this.memberByRoleCache.get(key)!;
  }

  createMemberByRole(role: string, data: FamilyMember) {
    return this.http
      .post(`${this.api}/${CONSTANTS.ROUTES.FAMILY_MEMBERS}/${role}`, data)
      .pipe(
        tap(() => this.invalidateRoleCache(role)),
        switchMap(() => this.fetchByRoleDirect(role))
      );
  }

  updateMemberByRole(role: string, data: Partial<FamilyMember>) {
    return this.http
      .put(`${this.api}/${CONSTANTS.ROUTES.FAMILY_MEMBERS}/${role}`, data)
      .pipe(
        tap(() => this.invalidateRoleCache(role)),
        switchMap(() => this.fetchByRoleDirect(role))
      );
  }

  saveMemberByRole(role: string, payload: any) {
    return this.http
      .put<any>(
        `${this.api}/${CONSTANTS.ROUTES.FAMILY_MEMBERS}/${role}`,
        payload
      )
      .pipe(
        tap(() => this.invalidateRoleCache(role)),
        switchMap(() => this.fetchByRoleDirect(role))
      );
  }

  deleteMemberByRole(role: string) {
    return this.http
      .delete<{ ok: boolean }>(
        `${this.api}/${CONSTANTS.ROUTES.FAMILY_MEMBERS}/${role}`
      )
      .pipe(tap(() => this.invalidateRoleCache(role)));
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
    return this.http.post(
      `${this.api}/${CONSTANTS.ROUTES.FAMILY_MEMBERS}/relationships`,
      data
    );
  }

  getMyFamilyPaged(
    page: number,
    size: number,
    sortField: string,
    sortOrder: string,
    opts?: {
      fields?: (keyof FamilyMember)[];
      with?: ('parentOf' | 'childOf' | 'media' | 'profile')[];
    }
  ) {
    const params: Record<string, string> = {
      page: String(page),
      size: String(size),
      sortField,
      sortOrder,
    };
    if (opts?.fields?.length) params['fields'] = opts.fields.join(',');
    if (opts?.with?.length) params['with'] = opts.with.join(',');

    return this.http.get<{ data: Partial<FamilyMember>[]; total: number }>(
      `${this.api}/${CONSTANTS.ROUTES.FAMILY_MEMBERS}/my-tree-paged`,
      { params }
    );
  }

  setPartner(
    memberId: string,
    partnerId: string,
    status: PartnerStatus = PartnerStatus.UNKNOWN
  ) {
    return this.http
      .post(`${this.api}/${CONSTANTS.ROUTES.FAMILY_MEMBERS}/set-partner`, {
        memberId,
        partnerId,
        status,
      })
      .pipe(tap(() => this.memberByRoleCache.clear()));
  }

  clearPartner(memberId: string) {
    return this.http
      .post(`${this.api}/${CONSTANTS.ROUTES.FAMILY_MEMBERS}/clear-partner`, {
        memberId,
      })
      .pipe(tap(() => this.memberByRoleCache.clear()));
  }
}

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  Observable,
  Subject,
  catchError,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { FamilyMember } from '../../shared/models/family-member.model';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { PartnerStatus } from '../../shared/enums/partner-status.enum';
import { CONSTANTS } from '../../shared/constants/constants';
import { BirthDeathDateMode } from '../../shared/enums/birth-death-date.enum';
import { ConfirmationService } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { FamilyMemberFormControls } from '../../shared/types/forms/family-member-form.types';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root',
})
export class FamilyService {
  private http = inject(HttpClient);
  private translate = inject(TranslateService);
  private confirmation = inject(ConfirmationService);
  private router = inject(Router);
  private messageService = inject(MessageService);
  private api = environment.apiUrl;
  private memberByRoleCache = new Map<string, Observable<any>>();
  private subscriptionLimit$ = new Subject<void>();

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

  onSubscriptionLimitReached() {
    return this.subscriptionLimit$.asObservable();
  }

  private handleSubscriptionLimitError(err: unknown) {
    this.handleParentConstraintError(err);
    if (err instanceof HttpErrorResponse && err.status === 400) {
      const rawMessage =
        (err.error?.message?.message as string | undefined) ??
        (err.error?.message as string | undefined) ??
        err.message;

      if (
        rawMessage &&
        rawMessage.toLowerCase().includes('subscription')
      ) {
        this.subscriptionLimit$.next();
        this.confirmation.confirm({
          header: this.translate.instant(CONSTANTS.SUBSCRIPTION_LIMIT_TITLE),
          message: this.translate.instant(CONSTANTS.SUBSCRIPTION_LIMIT_MESSAGE),
          acceptLabel: this.translate.instant(CONSTANTS.SUBSCRIPTION_LIMIT_CTA),
          rejectLabel: this.translate.instant(CONSTANTS.INFO_CANCEL),
          rejectVisible: true,
          acceptButtonStyleClass: 'p-button-primary',
          rejectButtonStyleClass: 'p-button-secondary',
          accept: () => {
            this.router.navigate([
              CONSTANTS.ROUTES.SETTINGS.SUBSCRIPTION_PLANS,
            ]);
          },
        });
      }
    }
    return throwError(() => err);
  }

  createFamilyMemberForm<
    TExtraControls extends Record<string, AbstractControl<any, any>> = Record<
      never,
      never
    >
  >(options: {
    destroyRef: DestroyRef;
    extraControls?: TExtraControls;
  }): FormGroup<FamilyMemberFormControls & TExtraControls> {
    const { destroyRef, extraControls } = options;
    const baseControls: FamilyMemberFormControls = {
      firstName: new FormControl<string | null>(null, Validators.required),
      middleName: new FormControl<string | null>(null),
      lastName: new FormControl<string | null>(null, Validators.required),
      gender: new FormControl<string | null>(null),

      dobMode: new FormControl<BirthDeathDateMode>(BirthDeathDateMode.EXACT, {
        nonNullable: true,
      }),
      dob: new FormControl<Date | null>(null),
      birthYear: new FormControl<number | null>(null),
      birthYearDate: new FormControl<Date | null>(null),
      birthNote: new FormControl<string | null>(null),

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
    };

    const fg = new FormGroup<FamilyMemberFormControls & TExtraControls>({
      ...(baseControls as FamilyMemberFormControls & TExtraControls),
      ...(extraControls ?? ({} as TExtraControls)),
    });

    const controls = fg.controls;

    const withTeardown = <T>(source: Observable<T>) =>
      source.pipe(takeUntilDestroyed(destroyRef));

    withTeardown(controls.dobMode.valueChanges).subscribe((mode) => {
      const dob = controls.dob;
      const by = controls.birthYear;
      const byDate = controls.birthYearDate;
      const bn = controls.birthNote;

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

    withTeardown(controls.birthYearDate.valueChanges).subscribe((d: Date | null) => {
      controls.birthYear.setValue(d ? d.getFullYear() : null, {
        emitEvent: false,
      });
    });

    const applyDodMode = () => {
      const mode = controls.dodMode.value;
      const dod = controls.dod;
      const dy = controls.deathYear;
      const dyDate = controls.deathYearDate;
      const dn = controls.deathNote;

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

    withTeardown(controls.dodMode.valueChanges).subscribe(() => applyDodMode());

    withTeardown(controls.deathYearDate.valueChanges).subscribe((d: Date | null) => {
      controls.deathYear.setValue(d ? d.getFullYear() : null, {
        emitEvent: false,
      });
    });

    withTeardown(controls.isAlive.valueChanges).subscribe((alive) => {
      if (alive) {
        controls.dod.setValue(null, { emitEvent: false });
        controls.deathYear.setValue(null, { emitEvent: false });
        controls.deathYearDate.setValue(null, { emitEvent: false });
        controls.deathNote.setValue(null, { emitEvent: false });
        return;
      }
      applyDodMode();
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
    ).pipe(catchError((err) => this.handleSubscriptionLimitError(err)));
  }

  upsertFamilyMember(data: FamilyMember) {
    return this.http.post(
      `${this.api}/${CONSTANTS.ROUTES.FAMILY_MEMBERS}/upsert`,
      data
    ).pipe(catchError((err) => this.handleSubscriptionLimitError(err)));
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
        switchMap(() => this.fetchByRoleDirect(role)),
        catchError((err) => this.handleSubscriptionLimitError(err))
      );
  }

  updateMemberByRole(role: string, data: Partial<FamilyMember>) {
    return this.http
      .put(`${this.api}/${CONSTANTS.ROUTES.FAMILY_MEMBERS}/${role}`, data)
      .pipe(
        tap(() => this.invalidateRoleCache(role)),
        switchMap(() => this.fetchByRoleDirect(role)),
        catchError((err) => this.handleSubscriptionLimitError(err))
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
        switchMap(() => this.fetchByRoleDirect(role)),
        catchError((err) => this.handleSubscriptionLimitError(err))
      );
  }

  deleteMemberByRole(role: string) {
    return this.http
      .delete<{
        ok: boolean;
        deletedCount?: number;
        deletedRoles?: string[];
        deletedMembers?: Array<{ role: string; firstName?: string; lastName?: string; fullName?: string }>;
      }>(
        `${this.api}/${CONSTANTS.ROUTES.FAMILY_MEMBERS}/${role}`
      )
      .pipe(tap(() => this.invalidateRoleCache(role)));
  }

  private handleParentConstraintError(err: unknown) {
    if (!(err instanceof HttpErrorResponse)) return;
    if (err.status !== 400) return;

    const raw =
      (err.error?.message?.message as string | undefined) ??
      (err.error?.message as string | undefined) ??
      err.message;

    if (!raw) return;

    const lower = raw.toLowerCase();
    const isMother =
      lower.includes('mother') && !lower.includes('grandfather') && !lower.includes('grandmother');
    const isFather =
      lower.includes('father') && !lower.includes('grandfather') && !lower.includes('grandmother');

    if (!(isMother || isFather)) return;

    const nameMatch = raw.match(/\"([^\"]+)\"/);
    const childName =
      nameMatch?.[1] ||
      this.translate.instant(CONSTANTS.COMMON_MEMBER).toLowerCase();

    const detail = this.translate.instant(
      isMother
        ? CONSTANTS.ERROR_PARENT_EXISTS_MOTHER
        : CONSTANTS.ERROR_PARENT_EXISTS_FATHER,
      { name: childName }
    );

    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant(CONSTANTS.COMMON_ERROR),
      detail,
    });
  }

  getDeleteImpact(role: string) {
    return this.http.get<{
      ok: boolean;
      count: number;
      roles: string[];
      members?: Array<{ role: string; firstName?: string; lastName?: string; fullName?: string }>;
    }>(
      `${this.api}/${CONSTANTS.ROUTES.FAMILY_MEMBERS}/${role}/delete-impact`
    );
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

  assignRole(memberId: string, newRole: string) {
    return this.http.post(
      `${this.api}/${CONSTANTS.ROUTES.FAMILY_MEMBERS}/assign-role`,
      { memberId, newRole }
    );
  }
}

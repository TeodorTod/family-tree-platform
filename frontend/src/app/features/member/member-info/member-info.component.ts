import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  ViewChild,
  inject,
  signal,
  DestroyRef,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormGroup } from '@angular/forms';
import { FamilyService } from '../../../core/services/family.service';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../shared/imports/shared-primeng-imports';
import { CONSTANTS } from '../../../shared/constants/constants';
import { TranslateService } from '@ngx-translate/core';
import { MemberAchievementsComponent } from '../components/member-achievements/member-achievements.component';
import { MemberBioComponent } from '../components/member-bio/member-bio.component';
import { MemberCareerComponent } from '../components/member-career/member-career.component';
import { MemberFavoritesComponent } from '../components/member-favorites/member-favorites.component';
import { MemberPersonalInfoComponent } from '../components/member-personal-info/member-personal-info.component';
import { MemberStoriesComponent } from '../components/member-stories/member-stories.component';
import { MemberMediaGalleryComponent } from '../components/member-media-gallery/member-media-gallery.component';
import { MemberProfileService } from '../../../core/services/member-profile.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MemberProfile } from '../../../shared/models/member-profile.model';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PartnerStatus } from '../../../shared/enums/partner-status.enum';
import { firstValueFrom, Observable, of, shareReplay, tap, switchMap } from 'rxjs';
import { TabRef } from '../../../shared/types/tab-ref.type';
import { UnsavedAware } from '../../../shared/interfaces/unsaved-aware';
import { BirthDeathDateMode } from '../../../shared/enums/birth-death-date.enum';
import { FIELDS } from '../../../shared/enums/fields.type';
import { RelationType } from '../../../shared/enums/relations.type';
import { Roles } from '../../../shared/enums/roles.enum';

@Component({
  selector: 'app-member-info',
  imports: [
    ...SHARED_ANGULAR_IMPORTS,
    ...SHARED_PRIMENG_IMPORTS,
    MemberBioComponent,
    MemberCareerComponent,
    MemberAchievementsComponent,
    MemberFavoritesComponent,
    MemberPersonalInfoComponent,
    MemberStoriesComponent,
    MemberMediaGalleryComponent,
  ],
  templateUrl: './member-info.component.html',
  styleUrls: ['./member-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberInfoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private familyService = inject(FamilyService);
  private profileService = inject(MemberProfileService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);
  private confirm = inject(ConfirmationService);
  private messageService = inject(MessageService);

  @ViewChild(MemberMediaGalleryComponent)
  mediaGallery!: MemberMediaGalleryComponent;

  readonly TAB = {
    GENERAL: 0,
    BIO: 1,
    MEDIA: 2,
    CAREER: 3,
    STORIES: 4,
    ACHIEVEMENTS: 5,
    FAVORITES: 6,
    PERSONAL: 7,
  } as const;

  member$!: Observable<any>;
  profile$!: Observable<MemberProfile | null>;
  private translatedRoleAuto = true;
  private lastDefaultTranslatedRole = '';

  private readonly statusKeyByEnum: Record<PartnerStatus, string> = {
    [PartnerStatus.MARRIED]: CONSTANTS.PARTNER_STATUS_MARRIED,
    [PartnerStatus.DIVORCED]: CONSTANTS.PARTNER_STATUS_DIVORCED,
    [PartnerStatus.SEPARATED]: CONSTANTS.PARTNER_STATUS_SEPARATED,
    [PartnerStatus.WIDOWED]: CONSTANTS.PARTNER_STATUS_WIDOWED,
    [PartnerStatus.ENGAGED]: CONSTANTS.PARTNER_STATUS_ENGAGED,
    [PartnerStatus.PARTNERS]: CONSTANTS.PARTNER_STATUS_PARTNERS,
    [PartnerStatus.FRIENDS]: CONSTANTS.PARTNER_STATUS_FRIENDS,
    [PartnerStatus.ANNULLED]: CONSTANTS.PARTNER_STATUS_ANNULLED,
    [PartnerStatus.UNKNOWN]: CONSTANTS.PARTNER_STATUS_UNKNOWN,
    [PartnerStatus.OTHER]: CONSTANTS.PARTNER_STATUS_OTHER,
  };

  form!: FormGroup;
  role!: string;
  CONSTANTS = CONSTANTS;
  ROLES = Roles;
  activeIndex = signal(0);
  profileDraft: MemberProfile = {};
  private lastSavedMemberSnapshot: any | null = null;
  dobModeOptions: Array<{ label: string; value: BirthDeathDateMode }> = [
    {
      label: this.translate.instant(CONSTANTS.INFO_DATE_OF_BIRTH),
      value: BirthDeathDateMode.EXACT,
    },
    {
      label: this.translate.instant(CONSTANTS.INFO_DOB_YEAR_ONLY),
      value: BirthDeathDateMode.YEAR,
    },
    {
      label: this.translate.instant(CONSTANTS.INFO_DOB_NOTE_LABEL),
      value: BirthDeathDateMode.NOTE,
    },
  ];

  dodModeOptions: Array<{ label: string; value: BirthDeathDateMode }> = [
    {
      label: this.translate.instant(CONSTANTS.INFO_DATE_OF_DEATH),
      value: BirthDeathDateMode.EXACT,
    },
    {
      label: this.translate.instant(CONSTANTS.INFO_DOD_YEAR_ONLY),
      value: BirthDeathDateMode.YEAR,
    },
    {
      label: this.translate.instant(CONSTANTS.INFO_DOD_NOTE_LABEL),
      value: BirthDeathDateMode.NOTE,
    },
  ];

  loadedMember?: any;
  partnerMember: { firstName?: string; lastName?: string } | null = null;
  originalPartnerStatus: PartnerStatus | null = null;

  partnerStatusOptions: Array<{ value: PartnerStatus; i18nKey: string }> =
    Object.values(PartnerStatus).map((v) => ({
      value: v as PartnerStatus,
      i18nKey: this.statusKeyByEnum[v as PartnerStatus],
    }));

  // ViewChild hooks (optional): if your child tabs expose getters, you can read them here
  @ViewChild(MemberBioComponent) bioTab?: TabRef<MemberBioComponent>;
  @ViewChild(MemberCareerComponent)
  careerTab?: TabRef<MemberCareerComponent>;
  @ViewChild(MemberAchievementsComponent)
  achievementsTab?: TabRef<MemberAchievementsComponent>;
  @ViewChild(MemberFavoritesComponent)
  favoritesTab?: TabRef<MemberFavoritesComponent>;
  @ViewChild(MemberPersonalInfoComponent)
  personalInfoTab?: TabRef<MemberPersonalInfoComponent>;
  @ViewChild(MemberStoriesComponent)
  storiesTab?: TabRef<MemberStoriesComponent>;
  @ViewChild(MemberMediaGalleryComponent)
  mediaGalleryTab?: TabRef<MemberMediaGalleryComponent>;

  ngOnInit() {
    this.role = this.route.snapshot.paramMap.get('role')!;
    this.form = this.familyService.createFamilyMemberForm({
      destroyRef: this.destroyRef,
    });
    this.trackTranslatedRoleChanges();
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateTranslatedRoleDefaultOnLangChange();
      });

    this.member$ = this.familyService.getFamilyMemberByRole(this.role).pipe(
      tap((member) => {
        this.loadedMember = member ?? undefined;
        this.lastSavedMemberSnapshot = this.normalizeMemberForPayload(
          member ?? {}
        );
        if (!member) {
          this.form.patchValue(
            {
              dobMode: BirthDeathDateMode.EXACT,
              dodMode: BirthDeathDateMode.EXACT,
              isAlive: true,
            },
            { emitEvent: false }
          );
          if (!this.hasConstant(this.role)) {
            this.applyDefaultTranslatedRole();
          }
          this.partnerMember = null;
          this.originalPartnerStatus = null;

          this.lastSavedMemberSnapshot = {
            firstName: '',
            middleName: null,
            lastName: '',
            gender: null,
            isAlive: true,
            translatedRole: this.hasConstant(this.role)
              ? null
              : this.setDefaultTranslatedRoleSnapshot(),
            dob: null,
            birthYear: null,
            birthNote: null,
            dod: null,
            deathYear: null,
            deathNote: null,
          };
          return;
        }

        const converted = this.convertDatesToObjects(member);

        let dobMode: BirthDeathDateMode = BirthDeathDateMode.EXACT;
        if (!converted.dob && converted.birthYear) {
          converted.dob = new Date(converted.birthYear, 0, 1);
          dobMode = BirthDeathDateMode.YEAR;
        } else if (converted.birthNote) {
          dobMode = BirthDeathDateMode.NOTE;
        }

        let dodMode: BirthDeathDateMode = BirthDeathDateMode.EXACT;
        if (converted.isAlive === false) {
          if (converted.dod) {
            dodMode = BirthDeathDateMode.EXACT;
          } else if ((converted as any).deathYear) {
            dodMode = BirthDeathDateMode.YEAR;
          } else if ((converted as any).deathNote) {
            dodMode = BirthDeathDateMode.NOTE;
          }
        }

        this.originalPartnerStatus = (member.partnerStatus ??
          null) as PartnerStatus | null;

        this.form.patchValue(
          {
            dobMode,
            dodMode,
            firstName: converted.firstName ?? null,
            middleName: converted.middleName ?? null,
            lastName: converted.lastName ?? null,
            gender: converted.gender ?? null,

            translatedRole:
              member.translatedRole ??
              (this.hasConstant(this.role)
                ? null
                : this.setDefaultTranslatedRoleSnapshot()),

            // birth
            dob: converted.dob ?? null,
            birthYear: converted.birthYear ?? null,
            birthNote: converted.birthNote ?? null,

            // life/death
            isAlive: converted.isAlive ?? true,
            dod: converted.dod ?? null,
            deathYear: (converted as any).deathYear ?? null,
            deathYearDate: (converted as any).deathYear
              ? new Date((converted as any).deathYear, 0, 1)
              : null,
            deathNote: (converted as any).deathNote ?? null,

            // partner
            partnerStatus: this.originalPartnerStatus,
          },
          { emitEvent: false }
        );
        this.translatedRoleAuto = !member?.translatedRole;

        if (member.partnerId) {
          this.familyService
            .getFamilyMemberById(member.partnerId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (partner) => {
                this.partnerMember = partner
                  ? {
                      firstName: partner.firstName,
                      lastName: partner.lastName,
                    }
                  : null;
              },
              error: () => {
                this.partnerMember = null;
              },
            });
        } else {
          this.partnerMember = null;
        }
      }),
      shareReplay(1)
    );

    this.profile$ = this.member$.pipe(
      switchMap((member: any) =>
        member?.id
          ? this.profileService.getProfileByMemberId(member.id)
          : of(null)
      ),
      tap((profile) => {
        this.profileDraft = profile ? { ...profile } : {};
      }),
      shareReplay(1)
    );

    this.ensureTranslatedRoleDefault();
  }

  get displayRoleLabel(): string {
    if (!this.hasConstant(this.role)) {
      const typed = (this.form?.get('translatedRole')?.value ?? '')
        .toString()
        .trim();
      return typed || this.defaultGenericForRole();
    }
    return this.getTranslatedRoleLabel();
  }

  onTabIndexChange(val: number | string | undefined) {
    const resolved = val ?? this.TAB.GENERAL;
    const n = typeof resolved === 'string' ? Number(resolved) : resolved;
    this.activeIndex.set(Number.isFinite(n) ? n : this.TAB.GENERAL);
  }

  private normalizeForComparison(input: any): any {
    const t = Object.prototype.toString.call(input);
    if (input == null) return null; // null/undefined -> null
    if (t === '[object Date]') return new Date(input as Date).toISOString();
    if (typeof input === 'string') return input.trim() === '' ? null : input;
    if (typeof input !== 'object') return input;

    if (Array.isArray(input)) {
      return input.map((v) => this.normalizeForComparison(v));
    }

    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(input)) {
      if (v === undefined) continue; // drop undefined keys
      out[k] = this.normalizeForComparison(v);
    }
    return out;
  }

  private deepEqual(a: any, b: any): boolean {
    try {
      const na = this.normalizeForComparison(a);
      const nb = this.normalizeForComparison(b);
      return JSON.stringify(na) === JSON.stringify(nb);
    } catch {
      return a === b;
    }
  }

  async save(): Promise<void> {
    const current = this.activeIndex();

    // ============= helpers =============
    const ok = (msgKey = this.CONSTANTS.INFO_SAVED) =>
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant(this.CONSTANTS.INFO_SUCCESS),
        detail: this.translate.instant(msgKey),
      });

    const nochanges = () =>
      this.messageService.add({
        severity: 'info',
        summary: this.translate.instant(this.CONSTANTS.INFO_UNSUCCESSFUL),
        detail: this.translate.instant(this.CONSTANTS.INFO_NO_CHANGES),
      });

    const fail = (msgKey = this.CONSTANTS.INFO_SAVE_FAILED) =>
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail:
          this.translate.instant(msgKey) ||
          this.translate.instant(CONSTANTS.INFO_SAVE_FAILED),
      });

    const sanitizeNotes = (arr: any): any[] =>
      (Array.isArray(arr) ? arr : [])
        .map((x) => ({
          id: x?.id ?? '',
          title: x?.title ?? '',
          contentHtml: x?.contentHtml ?? '',
        }))
        .sort((a, b) => String(a.id).localeCompare(String(b.id)));

    const buildDelta = (keys: string[], next: any): Record<string, any> => {
      const delta: Record<string, any> = {};
      for (const k of keys) {
        const prev = (this.profileDraft as any)?.[k];
        const pv = k === FIELDS.NOTES ? sanitizeNotes(prev) : prev ?? null;
        const nv =
          k === FIELDS.NOTES ? sanitizeNotes(next?.[k]) : next?.[k] ?? null;
        if (!this.deepEqual(pv, nv)) {
          delta[k] = next?.[k] ?? (k === FIELDS.NOTES ? [] : null);
        }
      }
      return delta;
    };

    // ---------- GENERAL (member basics) ----------
    let memberDiff: Record<string, any> = {};
    let statusChanged = false;
    let memberId: string | undefined;
    let partnerId: string | undefined;

    if (this.form.valid) {
      const dobPayload = this.familyService.buildDobPayload(this.form);
      const dodPayload = this.familyService.buildDodPayload(this.form);
      const v = this.form.value;

      const full: any = {
        firstName: v.firstName ?? '',
        middleName: v.middleName ?? null,
        lastName: v.lastName ?? '',
        gender: v.gender ?? null,
        isAlive: v.isAlive ?? true,
        translatedRole: v.translatedRole ?? null,
        ...dobPayload,
        ...dodPayload,
      };

      memberDiff = this.pruneUnchanged(full, this.lastSavedMemberSnapshot);

      const newStatus = (this.form.get('partnerStatus')?.value ??
        null) as PartnerStatus | null;
      memberId = this.loadedMember?.id;
      partnerId = this.loadedMember?.partnerId;
      statusChanged =
        !!newStatus &&
        newStatus !== this.originalPartnerStatus &&
        !!memberId &&
        !!partnerId;
    }

    // ---------- MEDIA (pending + cover) ----------
    const mediaPending = this.mediaGallery?.hasUnsavedChanges?.() === true;
    const nextCover = this.mediaGallery?.getCoverUrl?.();
    const coverDelta: Record<string, any> = {};
    if (nextCover !== undefined) {
      const prevCover = (this.profileDraft as any)?.coverMediaUrl ?? null;
      if (!this.deepEqual(prevCover, nextCover)) {
        coverDelta['coverMediaUrl'] = nextCover;
      }
    }

    // ---------- CHILD TABS deltas (save across tabs regardless of current) ----------
    const bioVal = this.childGetValue(this.bioTab); // { bio, notes }
    const careerVal = this.childGetValue(this.careerTab); // { education, work }
    const achievementsVal = this.childGetValue(this.achievementsTab); // array
    const favoritesVal = this.childGetValue(this.favoritesTab); // array
    const personalVal = this.childGetValue(this.personalInfoTab); // object
    const storiesVal = this.childGetValue(this.storiesTab); // array|object

    const profileDelta = {
      ...coverDelta,
      ...(this.childHasChanges(this.bioTab) && bioVal
        ? buildDelta([FIELDS.BIO, FIELDS.NOTES], bioVal)
        : {}),
      ...(this.childHasChanges(this.careerTab) && careerVal
        ? buildDelta([FIELDS.WORK, FIELDS.EDUCATION], careerVal)
        : {}),
      ...(this.childHasChanges(this.achievementsTab) && achievementsVal
        ? buildDelta([FIELDS.ACHIEVEMENTS], { achievements: achievementsVal })
        : {}),
      ...(this.childHasChanges(this.favoritesTab) && favoritesVal
        ? buildDelta([FIELDS.FAVORITES], { favorites: favoritesVal })
        : {}),
      ...(this.childHasChanges(this.personalInfoTab) && personalVal
        ? buildDelta([FIELDS.PERSONAL_INFO], { personalInfo: personalVal })
        : {}),
      ...(this.childHasChanges(this.storiesTab) && storiesVal
        ? buildDelta([FIELDS.STORIES], { stories: storiesVal })
        : {}),
    };

    const anythingToSave =
      Object.keys(memberDiff).length > 0 ||
      statusChanged ||
      mediaPending ||
      Object.keys(profileDelta).length > 0;

    if (!anythingToSave) return nochanges();

    try {
      // 1) MEDIA pending (apply uploads/add/remove)
      if (mediaPending) {
        if (!this.mediaGallery?.flushPendingChanges) {
          throw new Error('MEDIA_APPLY_FAILED');
        }
        await this.mediaGallery.flushPendingChanges();
      }

      // 2) MEMBER basics
      if (Object.keys(memberDiff).length > 0) {
        await firstValueFrom(
          this.familyService.saveMemberByRole(this.role, memberDiff)
        );
        this.lastSavedMemberSnapshot = {
          ...(this.lastSavedMemberSnapshot ?? {}),
          ...memberDiff,
        };
      }

      // Partner status (do after member, if needed)
      if (statusChanged) {
        const newStatus = this.form.get('partnerStatus')!
          .value as PartnerStatus;
        await firstValueFrom(
          this.familyService.setPartner(memberId!, partnerId!, newStatus)
        );
        this.originalPartnerStatus = newStatus;
      }

      // 3) PROFILE (bio, notes, education, work, achievements, favorites, personalInfo, stories, cover)
      if (Object.keys(profileDelta).length > 0) {
        const saved = await firstValueFrom(
          this.profileService.saveProfileByRole(this.role, profileDelta)
        );
        this.profileDraft = {
          ...(this.profileDraft ?? {}),
          ...(saved ?? profileDelta),
        };
        this.pushProfileToChild(this.profileDraft);
      }

      // Mark children as saved if present
      this.childMarkSaved(this.bioTab);
      this.childMarkSaved(this.careerTab);
      this.childMarkSaved(this.achievementsTab);
      this.childMarkSaved(this.favoritesTab);
      this.childMarkSaved(this.personalInfoTab);
      this.childMarkSaved(this.storiesTab);
      this.mediaGallery?.markSaved?.();

      this.form.markAsPristine();
      this.form.markAsUntouched();
      ok();
    } catch (e) {
      if ((e as any)?.message === 'MEDIA_APPLY_FAILED') {
        return fail(this.CONSTANTS.MEDIA_APPLY_FAILED);
      }
      fail();
    }
  }

  cancel(): void {
    if (this.hasAnyUnsavedChanges()) {
      this.confirm.confirm({
        header: this.translate.instant(CONSTANTS.INFO_UNSAVED_TITLE),
        message: this.translate.instant(CONSTANTS.INFO_UNSAVED_MESSAGE),
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: this.translate.instant(CONSTANTS.INFO_LEAVE),
        rejectLabel: this.translate.instant(CONSTANTS.INFO_STAY),
        acceptButtonStyleClass: 'p-button-danger',
        rejectButtonStyleClass: 'p-button-secondary',
        defaultFocus: 'reject',
        accept: () => {
          const previousView = this.route.snapshot.queryParamMap.get('view');
          this.router.navigate(['/'], {
            queryParams: { view: previousView || 'chart' },
          });
        },
      });
      return;
    }

    // no unsaved changes → navigate immediately
    const previousView = this.route.snapshot.queryParamMap.get('view');
    this.router.navigate(['/'], {
      queryParams: { view: previousView || 'chart' },
    });
  }
  private inferLineage(role: string): RelationType {
    const parts = role.toLowerCase().split('_');
    if (parts[0] === RelationType.PATERNAL) return RelationType.PATERNAL;
    if (parts[0] === RelationType.MATERNAL) return RelationType.MATERNAL;
    const iFather = parts.indexOf(Roles.FATHER);
    const iMother = parts.indexOf(Roles.MOTHER);
    if (iFather === -1 && iMother === -1) return RelationType.UNKNOWN;
    if (iFather !== -1 && iMother === -1) return RelationType.PATERNAL;
    if (iMother !== -1 && iFather === -1) return RelationType.MATERNAL;
    return iFather < iMother ? RelationType.PATERNAL : RelationType.MATERNAL;
  }

  private defaultGenericForRole(): string {
    const side = this.inferLineage(this.role);
    if (side === RelationType.MATERNAL)
      return this.translate.instant(CONSTANTS.RELATION_MATERNAL_GENERIC);
    if (side === RelationType.PATERNAL)
      return this.translate.instant(CONSTANTS.RELATION_PATERNAL_GENERIC);
    return this.translate.instant(CONSTANTS.RELATION_UNKNOWN);
  }

  getTranslatedRoleLabel(): string {
    if (!this.hasConstant(this.role)) {
      const v = this.form?.get('translatedRole')?.value;
      return v || this.defaultGenericForRole();
    }
    const parts = this.role.split('_');
    for (let len = parts.length; len > 0; len--) {
      const key = 'RELATION_' + parts.slice(0, len).join('_').toUpperCase();
      const constantKey = (CONSTANTS as any)[key] as string | undefined;
      if (constantKey) return this.translate.instant(constantKey);
    }
    return this.defaultGenericForRole();
  }

  private convertDatesToObjects(obj: any): any {
    const clone = { ...obj };
    for (const key of Object.keys(clone)) {
      const value = clone[key];
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
        clone[key] = new Date(value);
      } else if (typeof value === 'object' && value !== null) {
        clone[key] = this.convertDatesToObjects(value);
      }
    }
    return clone;
  }

  hasConstant(role: string): boolean {
    const key = 'RELATION_' + role.toUpperCase();
    return !!(CONSTANTS as any)[key];
  }

  confirmDelete() {
    if (this.role === Roles.OWNER) return;

    this.confirm.confirm({
      header: this.translate.instant(CONSTANTS.INFO_CONFIRM_DELETE_TITLE),
      message: this.translate.instant(CONSTANTS.INFO_CONFIRM_DELETE_MESSAGE),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant(CONSTANTS.INFO_DELETE),
      rejectLabel: this.translate.instant(CONSTANTS.INFO_CANCEL),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',

      defaultFocus: 'reject',
      accept: () => this.deleteMember(),
    });
  }

  private deleteMember() {
    this.familyService
      .deleteMemberByRole(this.role)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant(CONSTANTS.INFO_SUCCESS),
            detail: this.translate.instant(
              CONSTANTS.INFO_DELETE_MEMBER_MESSAGE
            ),
          });
          this.router.navigate(['/'], { queryParams: { view: 'chart' } });
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: this.translate.instant(CONSTANTS.INFO_UNSUCCESSFUL),
          });
          console.error(err);
        },
      });
  }

  private ensureTranslatedRoleDefault() {
    if (this.hasConstant(this.role)) return;
    const ctrl = this.form.get('translatedRole');
    const current = (ctrl?.value ?? '').toString().trim();
    this.lastDefaultTranslatedRole = this.defaultGenericForRole();

    if (!current) {
      this.translatedRoleAuto = true;
      ctrl?.setValue(this.lastDefaultTranslatedRole, { emitEvent: false });
      return;
    }

    this.translatedRoleAuto = current === this.lastDefaultTranslatedRole;
  }

  private isUnsavedAware(x: unknown): x is UnsavedAware {
    return !!x && typeof (x as any).hasUnsavedChanges === 'function';
  }

  private hasAnyUnsavedChanges(): boolean {
    let dirty = this.form?.dirty ?? false;
    const children = [
      this.bioTab,
      this.careerTab,
      this.achievementsTab,
      this.favoritesTab,
      this.personalInfoTab,
      this.storiesTab,
      this.mediaGallery,
    ];
    for (const c of children) {
      if (this.isUnsavedAware(c) && c.hasUnsavedChanges()) {
        dirty = true;
        break;
      }
    }
    return dirty;
  }

  // Normalize member from API into the shape we PUT
  private normalizeMemberForPayload(m: any) {
    return {
      firstName: m?.firstName ?? null,
      middleName: m?.middleName ?? null,
      lastName: m?.lastName ?? null,
      gender: m?.gender ?? null,
      isAlive: m?.isAlive ?? true,

      dob: m?.dob ? new Date(m.dob).toISOString() : null,
      birthYear: m?.birthYear ?? null,
      birthNote: m?.birthNote ?? null,

      dod: m?.dod ? new Date(m.dod).toISOString() : null,
      deathYear: m?.deathYear ?? null,
      deathNote: m?.deathNote ?? null,

      translatedRole: m?.translatedRole ?? null,
    };
  }

  private pruneUnchanged(
    next: Record<string, any>,
    prev: Record<string, any> | null
  ) {
    if (!prev) return next;
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(next)) {
      if (!this.deepEqual(v, (prev as any)[k])) out[k] = v;
    }
    return out;
  }

  private pushProfileToChild(next: MemberProfile | null) {
    this.profile$ = of(next ? { ...next } : null).pipe(shareReplay(1));
  }

  private childGetValue<T>(ref?: TabRef<any>): T | undefined {
    const fn = ref?.getValue?.bind(ref as any);
    return fn ? (fn() as T) : undefined;
  }
  private childHasChanges(ref?: TabRef<any>): boolean {
    return ref?.hasUnsavedChanges?.() === true;
  }
  private childMarkSaved(ref?: TabRef<any>): void {
    ref?.markSaved?.();
  }

  private trackTranslatedRoleChanges() {
    const ctrl = this.form.get('translatedRole');
    ctrl?.valueChanges
      ?.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const typed = (value ?? '').toString().trim();
        this.translatedRoleAuto =
          !typed || typed === this.lastDefaultTranslatedRole;
      });
  }

  private applyDefaultTranslatedRole() {
    if (this.hasConstant(this.role)) {
      return;
    }
    const ctrl = this.form.get('translatedRole');
    if (!ctrl) {
      return;
    }
    const next = this.defaultGenericForRole();
    this.lastDefaultTranslatedRole = next;
    ctrl.setValue(next, { emitEvent: false });
    this.translatedRoleAuto = true;
  }

  private setDefaultTranslatedRoleSnapshot() {
    const value = this.defaultGenericForRole();
    this.lastDefaultTranslatedRole = value;
    return value;
  }

  private updateTranslatedRoleDefaultOnLangChange() {
    this.lastDefaultTranslatedRole = this.defaultGenericForRole();
    if (!this.hasConstant(this.role) && this.translatedRoleAuto) {
      this.applyDefaultTranslatedRole();
    }
  }
}

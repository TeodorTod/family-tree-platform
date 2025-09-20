import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, shareReplay, tap } from 'rxjs';
import { MemberProfile } from '../../shared/models/member-profile.model';
import { UpsertPayload } from '../../shared/types/member-profile-upsert.type';
import {
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  Validators,
} from '@angular/forms';
import { WorkForm, WorkFormValue } from '../../shared/types/work-form.type';
import { EduFormValue, EduForm } from '../../shared/types/edu-form.type';
import { BirthDeathDateMode } from '../../shared/enums/birth-death-date.enum';
import { StoryItem } from '../../shared/models/story-item.model';
import { AchievementCategory } from '../../shared/enums/achievement-category.enum';
import { AchievementLevel } from '../../shared/enums/achievement-level.enum';
import { AchievementItem } from '../../shared/models/achievement-item.model';
import { FavoriteCategory } from '../../shared/enums/favorite-category.enum';
import { FavoriteItem } from '../../shared/models/favorite-item.model';
import { BloodType } from '../../shared/enums/blood-type.enum';
import { Handedness } from '../../shared/enums/handedness.enum';
import { SmokingStatus } from '../../shared/enums/smoking-status.enum';
import { PersonalInfoEntry } from '../../shared/models/personal-info-entry.model';

@Injectable({ providedIn: 'root' })
export class MemberProfileService {
  private http = inject(HttpClient);
  private fb = inject(NonNullableFormBuilder);
  private api = environment.apiUrl;
  private profileCache = new Map<string, Observable<MemberProfile | null>>();

  createEduForm(initial: Partial<EduFormValue> = {}): EduForm {
    return this.fb.group({
      name: this.fb.control(initial.name ?? '', {
        validators: [Validators.required],
      }),
      qualification: this.fb.control(initial.qualification ?? null),
      completed: this.fb.control(initial.completed ?? false),
      startYearDate: this.fb.control(initial.startYearDate ?? null, {
        validators: [Validators.required],
      }),
      endYearDate: this.fb.control(initial.endYearDate ?? null),
      notes: this.fb.control(initial.notes ?? null),
    });
  }

  createWorkForm(initial: Partial<WorkFormValue> = {}): WorkForm {
    return this.fb.group({
      employerName: this.fb.control(initial.employerName ?? '', {
        validators: [Validators.required],
      }),
      profession: this.fb.control(initial.profession ?? null),
      completed: this.fb.control(initial.completed ?? false),
      startYearDate: this.fb.control(initial.startYearDate ?? null, {
        validators: [Validators.required],
      }),
      endYearDate: this.fb.control(initial.endYearDate ?? null),
      notes: this.fb.control(initial.notes ?? null),
    });
  }

  yearToDate(y?: number | null) {
    return y ? new Date(y, 0, 1) : null;
  }

  populateEduForm(
    form: EduForm,
    e?: {
      name: string;
      qualification?: string | null;
      startYear: number;
      endYear?: number | null;
      completed: boolean;
      notes?: string | null;
    }
  ) {
    form.reset({
      name: e?.name ?? '',
      qualification: e?.qualification ?? null,
      completed: e?.completed ?? false,
      startYearDate: this.yearToDate(e?.startYear ?? null),
      endYearDate: this.yearToDate(e?.endYear ?? null),
      notes: e?.notes ?? null,
    });
    form.markAsPristine();
    form.markAsUntouched();
  }

  populateWorkForm(
    form: WorkForm,
    w?: {
      employerName: string;
      profession?: string | null;
      startYear: number;
      endYear?: number | null;
      completed: boolean;
      notes?: string | null;
    }
  ) {
    form.reset({
      employerName: w?.employerName ?? '',
      profession: w?.profession ?? null,
      completed: w?.completed ?? false,
      startYearDate: this.yearToDate(w?.startYear ?? null),
      endYearDate: this.yearToDate(w?.endYear ?? null),
      notes: w?.notes ?? null,
    });
    form.markAsPristine();
    form.markAsUntouched();
  }

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

  createStoryForm(
    initial: Partial<{
      title: string | null;
      dateMode: BirthDeathDateMode;
      exactDate: Date | null;
      yearDate: Date | null;
      freeDate: string | null;
      includedMemberIds: string[];
      content: string | null;
    }> = {}
  ): FormGroup<{
    title: FormControl<string | null>;
    dateMode: FormControl<BirthDeathDateMode>;
    exactDate: FormControl<Date | null>;
    yearDate: FormControl<Date | null>;
    freeDate: FormControl<string | null>;
    includedMemberIds: FormControl<string[]>;
    content: FormControl<string | null>;
  }> {
    return this.fb.group({
      // keep nullable
      title: new FormControl<string | null>(initial.title ?? null, {
        validators: [Validators.required],
      }),
      // make non-nullable via FormControl ctor (not FormBuilder.control)
      dateMode: new FormControl<BirthDeathDateMode>(
        initial.dateMode ?? BirthDeathDateMode.EXACT,
        { nonNullable: true }
      ),
      exactDate: new FormControl<Date | null>(initial.exactDate ?? null),
      yearDate: new FormControl<Date | null>(initial.yearDate ?? null),
      freeDate: new FormControl<string | null>(initial.freeDate ?? null),
      // non-nullable array
      includedMemberIds: new FormControl<string[]>(
        initial.includedMemberIds ?? [],
        { nonNullable: true }
      ),
      content: new FormControl<string | null>(initial.content ?? null),
    });
  }

  /** Reset to defaults */
  resetStoryForm(form: FormGroup) {
    form.reset({
      title: null,
      dateMode: BirthDeathDateMode.EXACT,
      exactDate: null,
      yearDate: null,
      freeDate: null,
      includedMemberIds: [],
      content: null,
    });
    form.markAsPristine();
    form.markAsUntouched();
  }

  /** Populate from a StoryItem for editing */
  populateStoryForm(form: FormGroup, s?: StoryItem) {
    form.reset({
      title: s?.title ?? null,
      dateMode: (s?.dateMode as BirthDeathDateMode) ?? BirthDeathDateMode.EXACT,
      exactDate: s?.exactDate ? new Date(s.exactDate) : null,
      yearDate: s?.year ? this.yearToDate(s.year) : null,
      freeDate: s?.freeDate ?? null,
      includedMemberIds: s?.includedMemberIds ?? [],
      content: s?.content ?? null,
    });
    form.markAsPristine();
    form.markAsUntouched();
  }

  /** Normalize form -> plain story fields (without id/createdAt) */
  storyDraftFromForm(form: FormGroup): Omit<StoryItem, 'id' | 'createdAt'> {
    const v = form.getRawValue() as {
      title: string | null;
      dateMode: BirthDeathDateMode;
      exactDate: Date | null;
      yearDate: Date | null;
      freeDate: string | null;
      includedMemberIds: string[];
      content: string | null;
    };
    const dm = v.dateMode ?? BirthDeathDateMode.EXACT;

    return {
      title: (v.title ?? '').trim(),
      dateMode: dm,
      exactDate:
        dm === BirthDeathDateMode.EXACT && v.exactDate
          ? v.exactDate.toISOString()
          : null,
      year:
        dm === BirthDeathDateMode.YEAR && v.yearDate
          ? v.yearDate.getFullYear()
          : null,
      freeDate:
        dm === BirthDeathDateMode.NOTE ? (v.freeDate ?? '').trim() : null,
      includedMemberIds: v.includedMemberIds ?? [],
      content: (v.content ?? '')?.trim() ?? '',
    } as Omit<StoryItem, 'id' | 'createdAt'>;
  }

  createAchievementForm(
    initial: Partial<{
      title: string | null;
      category: AchievementCategory | null;
      dateMode: BirthDeathDateMode;
      exactDate: Date | null;
      yearDate: Date | null;
      freeDate: string | null;
      organization: string | null;
      location: string | null;
      level: AchievementLevel | null;
    }> = {}
  ) {
    return this.fb.group({
      title: this.fb.control(initial.title ?? '', {
        validators: [Validators.required],
      }),

      category: new FormControl<AchievementCategory | null>(
        initial.category ?? null,
        { validators: [Validators.required] }
      ),

      dateMode: this.fb.control<BirthDeathDateMode>(
        initial.dateMode ?? BirthDeathDateMode.EXACT
      ),

      exactDate: new FormControl<Date | null>(initial.exactDate ?? null),
      yearDate: new FormControl<Date | null>(initial.yearDate ?? null),
      freeDate: new FormControl<string | null>(initial.freeDate ?? null),

      organization: new FormControl<string | null>(
        initial.organization ?? null
      ),
      location: new FormControl<string | null>(initial.location ?? null),
      level: new FormControl<AchievementLevel | null>(initial.level ?? null),
    });
  }

  resetAchievementForm(
    form: ReturnType<MemberProfileService['createAchievementForm']>
  ) {
    form.reset({
      title: '',
      category: null,
      dateMode: BirthDeathDateMode.EXACT,
      exactDate: null,
      yearDate: null,
      freeDate: null,
      organization: null,
      location: null,
      level: null,
    });
    form.markAsPristine();
    form.markAsUntouched();
  }

  populateAchievementForm(
    form: ReturnType<MemberProfileService['createAchievementForm']>,
    a?: AchievementItem
  ) {
    form.reset({
      title: a?.title ?? '',
      category: (a?.category as AchievementCategory) ?? null,
      dateMode: (a?.dateMode as BirthDeathDateMode) ?? BirthDeathDateMode.EXACT,
      exactDate: a?.exactDate ? new Date(a.exactDate) : null,
      yearDate: a?.year ? this.yearToDate(a.year) : null,
      freeDate: a?.freeDate ?? null,
      organization: a?.organization ?? null,
      location: a?.location ?? null,
      level: (a?.level as AchievementLevel | null) ?? null,
    });
    form.markAsPristine();
    form.markAsUntouched();
  }

  achievementDraftFromForm(
    form: ReturnType<MemberProfileService['createAchievementForm']>
  ) {
    const v = form.getRawValue();
    const dm = v.dateMode ?? BirthDeathDateMode.EXACT;
    return {
      title: (v.title ?? '').trim(),
      category: v.category!,
      dateMode: dm as BirthDeathDateMode,
      exactDate:
        dm === BirthDeathDateMode.EXACT && v.exactDate
          ? v.exactDate.toISOString()
          : null,
      year:
        dm === BirthDeathDateMode.YEAR && v.yearDate
          ? v.yearDate.getFullYear()
          : null,
      freeDate:
        dm === BirthDeathDateMode.NOTE ? (v.freeDate ?? '').trim() : null,
      organization: (v.organization ?? '')?.trim() || null,
      location: (v.location ?? '')?.trim() || null,
      level: v.level ?? null,
    } satisfies Omit<AchievementItem, 'id' | 'createdAt'>;
  }

  createFavoriteForm(
    initial: Partial<{
      category: FavoriteCategory | null;
      title: string | null;
      notes: string | null;
    }> = {}
  ) {
    return this.fb.group({
      category: this.fb.control<FavoriteCategory | null>(
        initial.category ?? null,
        { validators: [Validators.required] }
      ),
      title: this.fb.control(initial.title ?? '', {
        validators: [Validators.required],
      }),
      notes: this.fb.control(initial.notes ?? null),
    });
  }

  resetFavoriteForm(
    form: ReturnType<MemberProfileService['createFavoriteForm']>
  ) {
    form.reset({ category: null, title: '', notes: null });
    form.markAsPristine();
    form.markAsUntouched();
  }

  populateFavoriteForm(
    form: ReturnType<MemberProfileService['createFavoriteForm']>,
    f?: FavoriteItem
  ) {
    form.reset({
      category: (f?.category as FavoriteCategory) ?? null,
      title: f?.title ?? '',
      notes: f?.notes ?? null,
    });
    form.markAsPristine();
    form.markAsUntouched();
  }

  favoriteDraftFromForm(
    form: ReturnType<MemberProfileService['createFavoriteForm']>
  ): Omit<FavoriteItem, 'id' | 'createdAt'> {
    const v = form.getRawValue();
    return {
      category: (v.category as FavoriteCategory)?.toString(),
      title: (v.title ?? '').trim(),
      notes: (v.notes ?? '')?.trim() || null,
    };
  }

  createPersonalInfoForm(initial: Partial<PersonalInfoEntry> = {}): FormGroup<{
    religion: FormControl<string | null>;
    nameDay: FormControl<Date | null>;
    heightCm: FormControl<number | null>;
    weightKg: FormControl<number | null>;
    bloodType: FormControl<BloodType | null>;
    handedness: FormControl<Handedness | null>;
    smokingStatus: FormControl<SmokingStatus | null>;
    allergies: FormControl<string | null>;
    conditions: FormControl<string | null>;
    phone: FormControl<string | null>;
    email: FormControl<string | null>;
    website: FormControl<string | null>;
    address: FormControl<string | null>;
    notes: FormControl<string | null>;
  }> {
    return this.fb.group({
      religion: this.fb.control(initial.religion ?? null),
      nameDay: this.fb.control(initial.nameDay ?? null),
      heightCm: this.fb.control(initial.heightCm ?? null, {
        validators: [Validators.min(40), Validators.max(250)],
      }),
      weightKg: this.fb.control(initial.weightKg ?? null, {
        validators: [Validators.min(2), Validators.max(400)],
      }),
      bloodType: this.fb.control(initial.bloodType ?? null),
      handedness: this.fb.control(initial.handedness ?? null),
      smokingStatus: this.fb.control(initial.smokingStatus ?? null),
      allergies: this.fb.control(initial.allergies ?? null),
      conditions: this.fb.control(initial.conditions ?? null),
      phone: this.fb.control(initial.phone ?? null),
      email: this.fb.control(initial.email ?? null, {
        validators: [Validators.email],
      }),
      website: this.fb.control(initial.website ?? null),
      address: this.fb.control(initial.address ?? null),
      notes: this.fb.control(initial.notes ?? null),
    });
  }
}

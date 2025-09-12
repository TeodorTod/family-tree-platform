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
}

import {
  Component,
  Input,
  OnInit,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { SHARED_ANGULAR_IMPORTS } from '../../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../../shared/imports/shared-primeng-imports';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { v4 as uuid } from 'uuid';

import { MemberProfileService } from '../../../../core/services/member-profile.service';

import { UnsavedAware } from '../../../../shared/interfaces/unsaved-aware';
import { CONSTANTS } from '../../../../shared/constants/constants';
import { EducationEntry } from '../../../../shared/models/education-entry.model';
import { WorkEntry } from '../../../../shared/models/work-entry.model';
import { EduForm } from '../../../../shared/types/edu-form.type';
import { WorkForm } from '../../../../shared/types/work-form.type';

@Component({
  selector: 'app-member-career',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './member-career.component.html',
  styleUrls: ['./member-career.component.scss'],
})
export class MemberCareerComponent implements OnInit, UnsavedAware {
  @Input({ required: true }) role!: string;

  private profileApi = inject(MemberProfileService);
  private destroyRef = inject(DestroyRef);
  private translate = inject(TranslateService);

  CONSTANTS = CONSTANTS;

  // top tabs (like your media gallery segmented control)
  section = signal<'education' | 'work'>('education');
  showEducation() {
    this.section.set('education');
  }
  showWork() {
    this.section.set('work');
  }

  // lists
  education = signal<EducationEntry[]>([]);
  work = signal<WorkEntry[]>([]);

  // add/edit state
  editingEducationId: string | null = null;
  editingWorkId: string | null = null;

  // form: Education & Qualifications
  eduForm: EduForm = this.profileApi.createEduForm();
  workForm: WorkForm = this.profileApi.createWorkForm();

  // completed radio/select options
  completedOptions = [
    { label: this.translate.instant(CONSTANTS.CAREER_COMPLETED), value: true },
    {
      label: this.translate.instant(CONSTANTS.CAREER_NOT_COMPLETED),
      value: false,
    },
  ];

  // snapshots for "unsaved" detection
  private initialJson = '{"education":[],"work":[]}';

  ngOnInit(): void {
    // load existing profile (education/work arrays) by role
    this.profileApi
      .getProfileByRole(this.role)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((profile) => {
        const eduRaw = Array.isArray(profile?.education)
          ? (profile!.education as any[])
          : [];
        const workRaw = Array.isArray(profile?.work)
          ? (profile!.work as any[])
          : [];

        this.education.set(
          eduRaw.map((x) => this.coerceEdu(x)).sort(this.sortChronologicalDesc)
        );
        this.work.set(
          workRaw
            .map((x) => this.coerceWork(x))
            .sort(this.sortChronologicalDesc)
        );

        this.snapshotInitial();
      });
  }

  // ===== helpers: coercion & sorting =====
  private yearFromInput(d: Date | null): number | null {
    return d ? d.getFullYear() : null;
  }

  private toDateFromYear(y?: number | null): Date | null {
    return y ? new Date(y, 0, 1) : null;
  }

  private coerceEdu(x: any): EducationEntry {
    return {
      id: x?.id || uuid(),
      name: (x?.name ?? '').toString(),
      qualification: x?.qualification ?? x?.institution ?? null, // compat
      startYear:
        Number(x?.startYear) ||
        this.yearFromInput(this.toDateFromYear(x?.startYear)) ||
        new Date().getFullYear(),
      endYear: x?.endYear != null ? Number(x.endYear) : null,
      completed: Boolean(x?.completed),
      notes: x?.notes ?? null,
    };
  }

  private coerceWork(x: any): WorkEntry {
    return {
      id: x?.id || uuid(),
      employerName: (x?.employerName ?? '').toString(),
      profession: x?.profession ?? null,
      startYear:
        Number(x?.startYear) ||
        this.yearFromInput(this.toDateFromYear(x?.startYear)) ||
        new Date().getFullYear(),
      endYear: x?.endYear != null ? Number(x.endYear) : null,
      completed: Boolean(x?.completed),
      notes: x?.notes ?? null,
    };
  }

  private sortChronologicalDesc = <
    T extends { endYear?: number | null; startYear: number }
  >(
    a: T,
    b: T
  ) => {
    const aEnd = a.endYear ?? 9999;
    const bEnd = b.endYear ?? 9999;
    if (aEnd !== bEnd) return bEnd - aEnd;
    return b.startYear - a.startYear;
  };

  private snapshotInitial(): void {
    this.initialJson = JSON.stringify(this.getValue());
  }

  // ===== CRUD: Education =====
  addOrUpdateEducation() {
    if (this.eduForm.invalid) return;
    const f = this.eduForm.value;
    const start = this.yearFromInput(f.startYearDate!)!;
    const end = f.completed ? this.yearFromInput(f.endYearDate ?? null) : null;

    const payload: EducationEntry = {
      id: this.editingEducationId ?? uuid(),
      name: f.name!.trim(),
      qualification: (f.qualification ?? null) || null,
      startYear: start,
      endYear: f.completed ? end : null,
      completed: !!f.completed,
      notes: (f.notes ?? null) || null,
    };

    if (this.editingEducationId) {
      this.education.update((arr) =>
        arr
          .map((x) => (x.id === payload.id ? payload : x))
          .sort(this.sortChronologicalDesc)
      );
    } else {
      this.education.update((arr) =>
        [...arr, payload].sort(this.sortChronologicalDesc)
      );
    }

    this.resetEducationForm();
  }

  editEducation(row: EducationEntry) {
    this.editingEducationId = row.id;
    this.profileApi.populateEduForm(this.eduForm, row);
  }

  deleteEducation(row: EducationEntry) {
    this.education.update((arr) => arr.filter((x) => x.id !== row.id));
    if (this.editingEducationId === row.id) this.resetEducationForm();
  }

  resetEducationForm() {
    this.editingEducationId = null;
    this.profileApi.populateEduForm(this.eduForm); // blank
  }

  // ===== CRUD: Work =====
  addOrUpdateWork() {
    if (this.workForm.invalid) return;
    const f = this.workForm.value;
    const start = this.yearFromInput(f.startYearDate!)!;
    const end = f.completed ? this.yearFromInput(f.endYearDate ?? null) : null;

    const payload: WorkEntry = {
      id: this.editingWorkId ?? uuid(),
      employerName: f.employerName!.trim(),
      profession: (f.profession ?? null) || null, // NEW
      startYear: start,
      endYear: f.completed ? end : null,
      completed: !!f.completed,
      notes: (f.notes ?? null) || null,
    };

    if (this.editingWorkId) {
      this.work.update((arr) =>
        arr
          .map((x) => (x.id === payload.id ? payload : x))
          .sort(this.sortChronologicalDesc)
      );
    } else {
      this.work.update((arr) =>
        [...arr, payload].sort(this.sortChronologicalDesc)
      );
    }

    this.resetWorkForm();
  }

  editWork(row: WorkEntry) {
    this.editingWorkId = row.id;
    this.profileApi.populateWorkForm(this.workForm, row);
  }

  deleteWork(row: WorkEntry) {
    this.work.update((arr) => arr.filter((x) => x.id !== row.id));
    if (this.editingWorkId === row.id) this.resetWorkForm();
  }

  resetWorkForm() {
    this.editingWorkId = null;
    this.profileApi.populateWorkForm(this.workForm); // blank
  }

  // ===== Parent API (used by MemberInfoComponent) =====
  getValue() {
    const education = this.education().map((e) => ({
      id: e.id,
      name: e.name,
      qualification: e.qualification ?? null,
      startYear: e.startYear,
      endYear: e.completed ? e.endYear ?? null : null,
      completed: e.completed,
      notes: e.notes ?? null,
    }));

    const work = this.work().map((w) => ({
      id: w.id,
      employerName: w.employerName,
      profession: w.profession ?? null, // NEW
      startYear: w.startYear,
      endYear: w.completed ? w.endYear ?? null : null,
      completed: w.completed,
      notes: w.notes ?? null,
    }));

    return { education, work };
  }

  hasUnsavedChanges(): boolean {
    return JSON.stringify(this.getValue()) !== this.initialJson;
  }

  markSaved(): void {
    this.snapshotInitial();
  }
}

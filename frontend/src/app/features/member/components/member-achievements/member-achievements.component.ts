import {
  Component,
  ChangeDetectionStrategy,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { v4 as uuid } from 'uuid';
import { FormGroup } from '@angular/forms';
import { SHARED_ANGULAR_IMPORTS } from '../../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../../shared/imports/shared-primeng-imports';

import { MemberProfile } from '../../../../shared/models/member-profile.model';
import { AchievementItem } from '../../../../shared/models/achievement-item.model';
import { AchievementCategory } from '../../../../shared/enums/achievement-category.enum';
import { AchievementLevel } from '../../../../shared/enums/achievement-level.enum';
import { BirthDeathDateMode } from '../../../../shared/enums/birth-death-date.enum';
import { MemberProfileService } from '../../../../core/services/member-profile.service';
import { TranslateService } from '@ngx-translate/core';
import { CONSTANTS } from '../../../../shared/constants/constants';
import { UnsavedAware } from '../../../../shared/interfaces/unsaved-aware';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-member-achievements',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './member-achievements.component.html',
  styleUrls: ['./member-achievements.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberAchievementsComponent
  implements OnInit, OnChanges, UnsavedAware
{
  @Input({ required: true }) role!: string;
  @Input() profile: MemberProfile | null = null;

  CONSTANTS = CONSTANTS;
  BirthDeathDateMode = BirthDeathDateMode;

  private profileSvc = inject(MemberProfileService);
  private translate = inject(TranslateService);
  private confirm = inject(ConfirmationService);

  form: FormGroup = this.profileSvc.createAchievementForm();

  achievements = signal<AchievementItem[]>([]);
  editingId = signal<string | null>(null);
  private initialJson = '[]';

  // Select options
  categoryOptions = Object.values(AchievementCategory).map((v) => ({
    value: v as AchievementCategory,
    i18nKey: `ACH.CATEGORY.${v}`, // e.g., ACH.CATEGORY.ACADEMIC
  }));

  levelOptions = Object.values(AchievementLevel).map((v) => ({
    value: v as AchievementLevel,
    i18nKey: `ACH.LEVEL.${v}`, // e.g., ACH.LEVEL.NATIONAL
  }));

  dateModeOptions = [
    {
      label: this.translate.instant(CONSTANTS.INFO_EXACT_DATE),
      value: BirthDeathDateMode.EXACT,
    },
    {
      label: this.translate.instant(CONSTANTS.INFO_YEAR_ONLY),
      value: BirthDeathDateMode.YEAR,
    },
    {
      label: this.translate.instant(CONSTANTS.INFO_FREE_DATE),
      value: BirthDeathDateMode.NOTE,
    },
  ];

  ngOnInit(): void {
    this.hydrateFromProfile();
    this.wireDateModeValidators();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['profile']) this.hydrateFromProfile();
  }

  private hydrateFromProfile() {
    const raw = (this.profile?.achievements ?? []) as any[];
    const norm: AchievementItem[] = (Array.isArray(raw) ? raw : []).map(
      (a) => ({
        id: a.id ?? uuid(),
        title: a.title ?? '',
        category: a.category as AchievementCategory,
        dateMode:
          (a.dateMode as BirthDeathDateMode) ?? BirthDeathDateMode.EXACT,
        exactDate: a.exactDate ?? null,
        year: a.year ?? null,
        freeDate: a.freeDate ?? null,
        organization: a.organization ?? null,
        location: a.location ?? null,
        level: (a.level as AchievementLevel | null) ?? null,
        createdAt: a.createdAt ?? new Date().toISOString(),
      })
    );
    norm.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    this.achievements.set(norm);
    this.snapshotInitial();
  }

  private snapshotInitial() {
    this.initialJson = JSON.stringify(this.achievements());
  }

  private wireDateModeValidators() {
    const c = this.form.get('category')!;
    const title = this.form.get('title')!;
    const dateMode = this.form.get('dateMode')!;
    const exact = this.form.get('exactDate')!;
    const yearDate = this.form.get('yearDate')!;
    const free = this.form.get('freeDate')!;

    // basic required are already set in the service builder
    dateMode.valueChanges.subscribe((mode: BirthDeathDateMode) => {
      exact.clearValidators();
      yearDate.clearValidators();
      free.clearValidators();
      if (mode === BirthDeathDateMode.EXACT) {
        // exact date optional (can keep null and rely on title+category only)
      } else if (mode === BirthDeathDateMode.YEAR) {
        // just ensure yearDate present if user chooses YEAR
      } else {
        // NOTE: optional as well; you can make it required if you want
      }
      exact.updateValueAndValidity({ emitEvent: false });
      yearDate.updateValueAndValidity({ emitEvent: false });
      free.updateValueAndValidity({ emitEvent: false });
    });
  }

  addAchievement() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const draft = this.profileSvc.achievementDraftFromForm(
      this.form as any
    ) as Omit<AchievementItem, 'id' | 'createdAt'>;

    const newItem: AchievementItem = {
      id: uuid(),
      createdAt: new Date().toISOString(),
      ...draft,
    };
    this.achievements.update((arr) => [newItem, ...arr]);
    this.profileSvc.resetAchievementForm(this.form as any);
  }

  startEdit(a: AchievementItem) {
    this.editingId.set(a.id);
    this.profileSvc.populateAchievementForm(this.form as any, a);
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  saveEdit() {
    const id = this.editingId();
    if (!id || this.form.invalid) return;
    const draft = this.profileSvc.achievementDraftFromForm(this.form as any);

    this.achievements.update((arr) => {
      const idx = arr.findIndex((x) => x.id === id);
      if (idx === -1) return arr;
      const next = [...arr];
      next[idx] = { ...next[idx], ...draft };
      return next;
    });

    this.editingId.set(null);
    this.profileSvc.resetAchievementForm(this.form as any);
  }

  cancelEdit() {
    this.editingId.set(null);
    this.profileSvc.resetAchievementForm(this.form as any);
  }

  removeAchievement(id: string) {
    this.confirm.confirm({
      header: this.translate.instant(
        CONSTANTS.ACH_DELETE_TITLE ?? CONSTANTS.INFO_CONFIRM_DELETE_TITLE
      ),
      message: this.translate.instant(
        CONSTANTS.ACH_DELETE_MSG ?? CONSTANTS.BIO_ACTION_NOT_UNDONE
      ),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant(CONSTANTS.INFO_DELETE),
      rejectLabel: this.translate.instant(CONSTANTS.INFO_CANCEL),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      defaultFocus: 'reject',
      accept: () => {
        this.achievements.update((arr) => arr.filter((x) => x.id !== id));
        if (this.editingId() === id) this.cancelEdit();
      },
    });
  }

  // ----- Parent TabRef contract -----
  getValue(): AchievementItem[] {
    return this.achievements();
  }
  hasUnsavedChanges(): boolean {
    return JSON.stringify(this.achievements()) !== this.initialJson;
  }
  markSaved(): void {
    this.snapshotInitial();
  }

  // UI helpers
  displayDate(a: AchievementItem): string {
    if (a.dateMode === BirthDeathDateMode.EXACT && a.exactDate) {
      const d = new Date(a.exactDate);
      return isNaN(d.getTime()) ? a.exactDate : d.toLocaleDateString();
    }
    if (a.dateMode === BirthDeathDateMode.YEAR && a.year) return String(a.year);
    if (a.dateMode === BirthDeathDateMode.NOTE && a.freeDate) return a.freeDate;
    return '—';
  }
}

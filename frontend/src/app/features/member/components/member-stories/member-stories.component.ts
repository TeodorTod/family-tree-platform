import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { v4 as uuid } from 'uuid';

import { SHARED_ANGULAR_IMPORTS } from '../../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../../shared/imports/shared-primeng-imports';

import { FamilyService } from '../../../../core/services/family.service';
import { MemberProfile } from '../../../../shared/models/member-profile.model';
import { UnsavedAware } from '../../../../shared/interfaces/unsaved-aware';
import { CONSTANTS } from '../../../../shared/constants/constants';
import { TranslateService } from '@ngx-translate/core';
import { BirthDeathDateMode } from '../../../../shared/enums/birth-death-date.enum';
import { ConfirmationService } from 'primeng/api';
import { MemberOption } from '../../../../shared/models/member-option.model';
import { StoryItem } from '../../../../shared/models/story-item.model';
import { MemberProfileService } from '../../../../core/services/member-profile.service';

@Component({
  selector: 'app-member-stories',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './member-stories.component.html',
  styleUrls: ['./member-stories.component.scss'],
})
export class MemberStoriesComponent implements OnInit, OnChanges, UnsavedAware {
  @Input({ required: true }) role!: string;
  @Input() memberId: string | null = null;
  @Input() profile: MemberProfile | null = null;

  CONSTANTS = CONSTANTS;

  private fb = inject(FormBuilder);
  private familyService = inject(FamilyService);
  private translate = inject(TranslateService);
  private confirm = inject(ConfirmationService);
  private profileSvc = inject(MemberProfileService);

  expandedPanels: string[] = [];
  form = this.profileSvc.createStoryForm();

  // MultiSelect options
  memberOptions = signal<MemberOption[]>([]);
  loadingMembers = signal<boolean>(false);
  editingId = signal<string | null>(null);

  // Stories state
  stories = signal<StoryItem[]>([]);
  private initialStoriesJson = '[]';

  dateModeOptions = [
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

  ngOnInit(): void {
    this.loadMembers();
    this.hydrateFromProfile();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['profile']) this.hydrateFromProfile();
  }

  private loadMembers() {
    this.loadingMembers.set(true);
    this.familyService
      .getMyFamily({ fields: ['id', 'firstName', 'lastName'] as any })
      .subscribe({
        next: (list) => {
          const opts: MemberOption[] = (list ?? [])
            .filter((m: any) => m?.id)
            .map((m: any) => ({
              id: m.id!,
              fullName: [m.firstName, m.lastName].filter(Boolean).join(' '),
            }))
            .sort((a, b) => a.fullName.localeCompare(b.fullName));
          this.memberOptions.set(opts);
        },
        error: () => this.memberOptions.set([]),
        complete: () => this.loadingMembers.set(false),
      });
  }

  private hydrateFromProfile() {
    const raw = (this.profile?.stories ?? []) as any[];
    const normalized: StoryItem[] = (Array.isArray(raw) ? raw : []).map(
      (s) => ({
        id: s.id ?? uuid(),
        title: s.title ?? '',
        dateMode: (s.dateMode ?? 'free') as BirthDeathDateMode,
        exactDate: s.exactDate ?? null,
        year: s.year ?? null,
        freeDate: s.freeDate ?? null,
        includedMemberIds: Array.isArray(s.includedMemberIds)
          ? s.includedMemberIds
          : [],
        content: s.content ?? '',
        createdAt: s.createdAt ?? new Date().toISOString(),
      })
    );
    normalized.sort((a, b) =>
      (b.createdAt || '').localeCompare(a.createdAt || '')
    );
    this.stories.set(normalized);
    this.snapshotInitial();
  }

  private snapshotInitial() {
    this.initialStoriesJson = JSON.stringify(this.stories());
  }

  displayDate(s: StoryItem): string {
    if (s.dateMode === BirthDeathDateMode.EXACT && s.exactDate) {
      const d = new Date(s.exactDate);
      return isNaN(d.getTime()) ? s.exactDate : d.toLocaleDateString();
    }
    if (s.dateMode === BirthDeathDateMode.YEAR && s.year) return String(s.year);
    if (s.dateMode === BirthDeathDateMode.NOTE && s.freeDate) return s.freeDate;
    return '—';
  }

  memberNames(ids: string[]): string {
    const map = new Map(this.memberOptions().map((m) => [m.id, m.fullName]));
    return (ids ?? []).map((id) => map.get(id) ?? id).join(', ');
  }

  addStory() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const draft = this.profileSvc.storyDraftFromForm(this.form);
    const newItem: StoryItem = {
      id: uuid(),
      ...draft,
      createdAt: new Date().toISOString(),
    };
    this.stories.update((arr) => [newItem, ...arr]);
    this.profileSvc.resetStoryForm(this.form);
  }

  // Parent integration
  getValue(): StoryItem[] {
    return this.stories();
  }
  hasUnsavedChanges(): boolean {
    return JSON.stringify(this.stories()) !== this.initialStoriesJson;
  }
  markSaved(): void {
    this.snapshotInitial();
  }

  startEdit(s: StoryItem) {
    this.editingId.set(s.id);
    this.profileSvc.populateStoryForm(this.form, s);
    if (!this.expandedPanels.includes(s.id))
      this.expandedPanels = [...this.expandedPanels, s.id];
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  // Apply edits
  saveEdit() {
    const id = this.editingId();
    if (!id || this.form.invalid) return;
    const draft = this.profileSvc.storyDraftFromForm(this.form);
    this.stories.update((arr) => {
      const idx = arr.findIndex((x) => x.id === id);
      if (idx === -1) return arr;
      const next = [...arr];
      next[idx] = { ...next[idx], ...draft };
      return next;
    });
    this.editingId.set(null);
    this.profileSvc.resetStoryForm(this.form);
  }

  // Cancel edit & return to add mode
  cancelEdit() {
    this.editingId.set(null);
    this.profileSvc.resetStoryForm(this.form);
  }
  // If a currently edited story gets deleted, exit edit mode gracefully
  removeStory(id: string) {
    this.confirm.confirm({
      header: this.translate.instant(CONSTANTS.STORIES_DELETE_STORY),
      message: this.translate.instant(CONSTANTS.BIO_ACTION_NOT_UNDONE),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant(CONSTANTS.INFO_DELETE),
      rejectLabel: this.translate.instant(CONSTANTS.INFO_CANCEL),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      defaultFocus: 'reject',
      accept: () => {
        this.stories.update((arr) => arr.filter((s) => s.id !== id));
        if (this.editingId() === id) this.cancelEdit();
      },
    });
  }

  onEditBtn(ev: Event, s: StoryItem) {
    this.stopAll(ev);
    this.startEdit(s);
  }

  onRemoveBtn(ev: Event, id: string) {
    this.stopAll(ev);
    this.removeStory(id);
  }

  private stopAll(ev: Event) {
    ev.preventDefault();
    ev.stopPropagation();
    (ev as any).stopImmediatePropagation?.();
  }
}

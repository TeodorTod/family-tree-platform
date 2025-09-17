import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { SHARED_ANGULAR_IMPORTS } from '../../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../../shared/imports/shared-primeng-imports';
import { CONSTANTS } from '../../../../shared/constants/constants';
import { MemberProfile } from '../../../../shared/models/member-profile.model';
import { FavoriteItem } from '../../../../shared/models/favorite-item.model';
import { FavoriteCategory } from '../../../../shared/enums/favorite-category.enum';
import { MemberProfileService } from '../../../../core/services/member-profile.service';
import { TranslateService } from '@ngx-translate/core';
import { ConfirmationService } from 'primeng/api';
import { v4 as uuid } from 'uuid';
import { UnsavedAware } from '../../../../shared/interfaces/unsaved-aware';

@Component({
  selector: 'app-member-favorites',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './member-favorites.component.html',
  styleUrls: ['./member-favorites.component.scss'],
})
export class MemberFavoritesComponent
  implements OnInit, OnChanges, UnsavedAware
{
  @Input({ required: true }) role!: string;
  @Input() profile: MemberProfile | null = null;

  CONSTANTS = CONSTANTS;
  FavoriteCategory = FavoriteCategory;

  private profileSvc = inject(MemberProfileService);
  private translate = inject(TranslateService);
  private confirm = inject(ConfirmationService);

  form = this.profileSvc.createFavoriteForm();
  favorites = signal<FavoriteItem[]>([]);
  editingId = signal<string | null>(null);
  private initialJson = '[]';

  categoryOptions = Object.values(FavoriteCategory).map((v) => ({
    value: v,
    i18nKey: this.categoryKey(v),
  }));

  ngOnInit(): void {
    this.hydrate();
  }

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['profile']) this.hydrate();
  }

  private categoryKey(v: FavoriteCategory | string) {
    return `FAV.CATEGORY.${v}`;
  }

  private hydrate() {
    const raw = (this.profile?.favorites ?? []) as any[];
    const items: FavoriteItem[] = (Array.isArray(raw) ? raw : []).map((x) => ({
      id: x?.id ?? uuid(),
      category: x?.category ?? FavoriteCategory.OTHER,
      title: x?.title ?? '',
      notes: x?.notes ?? null,
      createdAt: x?.createdAt ?? new Date().toISOString(),
    }));
    items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    this.favorites.set(items);
    this.snapshot();
  }

  private snapshot() {
    this.initialJson = JSON.stringify(this.favorites());
  }

  // TabRef-like API for parent
  getValue(): FavoriteItem[] {
    return this.favorites();
  }
  hasUnsavedChanges(): boolean {
    return JSON.stringify(this.favorites()) !== this.initialJson;
  }
  markSaved(): void {
    this.snapshot();
  }

  // UI actions
  addFavorite() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const draft = this.profileSvc.favoriteDraftFromForm(this.form);
    const item: FavoriteItem = {
      id: uuid(),
      ...draft,
      createdAt: new Date().toISOString(),
    };
    this.favorites.update((arr) => [item, ...arr]);
    this.profileSvc.resetFavoriteForm(this.form);
  }

  startEdit(f: FavoriteItem) {
    this.editingId.set(f.id);
    this.profileSvc.populateFavoriteForm(this.form, f);
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  saveEdit() {
    const id = this.editingId();
    if (!id || this.form.invalid) return;
    const draft = this.profileSvc.favoriteDraftFromForm(this.form);
    this.favorites.update((arr) => {
      const i = arr.findIndex((x) => x.id === id);
      if (i === -1) return arr;
      const next = [...arr];
      next[i] = { ...next[i], ...draft };
      return next;
    });
    this.editingId.set(null);
    this.profileSvc.resetFavoriteForm(this.form);
  }

  cancelEdit() {
    this.editingId.set(null);
    this.profileSvc.resetFavoriteForm(this.form);
  }

  removeFavorite(id: string) {
    this.confirm.confirm({
      header: this.translate.instant(CONSTANTS.FAV_DELETE_TITLE),
      message: this.translate.instant(CONSTANTS.FAV_DELETE_MSG),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant(CONSTANTS.INFO_DELETE),
      rejectLabel: this.translate.instant(CONSTANTS.INFO_CANCEL),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      defaultFocus: 'reject',
      accept: () => {
        this.favorites.update((arr) => arr.filter((f) => f.id !== id));
        if (this.editingId() === id) this.cancelEdit();
      },
    });
  }
}

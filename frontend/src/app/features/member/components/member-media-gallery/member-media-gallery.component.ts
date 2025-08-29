import {
  Component,
  Input,
  OnInit,
  inject,
  signal,
  DestroyRef,
  ViewChild,
} from '@angular/core';
import { SHARED_PRIMENG_IMPORTS } from '../../../../shared/imports/shared-primeng-imports';
import { SHARED_ANGULAR_IMPORTS } from '../../../../shared/imports/shared-angular-imports';
import { MediaService } from '../../../../core/services/media.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { CONSTANTS } from '../../../../shared/constants/constants';
import { MediaItem } from '../../../../shared/models/media-item.model';
import { FileUpload } from 'primeng/fileupload';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-member-media-gallery',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './member-media-gallery.component.html',
  styleUrls: ['./member-media-gallery.component.scss'],
})
export class MemberMediaGalleryComponent implements OnInit {
  private _memberId: string | null = null;

  @ViewChild('imgUpload') imgUpload?: FileUpload;

  @Input({ required: true }) role!: string;
  @Input() uploadMode: 'immediate' | 'onSave' = 'immediate';
  @Input()
  set memberId(value: string | null) {
    const changed = value !== this._memberId;
    this._memberId = value;
    if (changed && this._memberId) this.load();
  }
  get memberId(): string | null {
    return this._memberId;
  }

  private media = inject(MediaService);
  private destroyRef = inject(DestroyRef);
  private messages = inject(MessageService);

  CONSTANTS = CONSTANTS;

  private stagedFiles: File[] = [];
  private stagedKeys = new Set<string>();
  private key = (f: File) => `${f.name}|${f.size}|${f.type}|${f.lastModified}`;
  private stagedDeletes = new Set<string>();
  private stagedDeleteUrls = new Map<string, string>();
  private selectedCoverUrl: string | null = null;

  editMode = signal<'none' | 'images' | 'videos'>('none');
  section = signal<'images' | 'videos'>('images');
  showImages() {
    this.section.set('images');
  }
  showVideos() {
    this.section.set('videos');
  }
  startEditImages() {
    this.editMode.set('images');
  }
  startEditVideos() {
    this.editMode.set('videos');
  }
  doneEdit() {
    this.editMode.set('none');
  }

  // data
  images = signal<MediaItem[]>([]);
  videos = signal<MediaItem[]>([]);
  loading = signal<boolean>(false);
  activeIndex = 0;

  private keyFromItem(x: MediaItem) {
    return (x as any).id ?? x.url;
  }

  ngOnInit(): void {
    this.load();
  }

  get pendingUploadsCount() {
    return this.stagedFiles.length;
  }
  get pendingDeletesCount() {
    return this.stagedDeletes.size;
  }

  public hasUnsavedChanges(): boolean {
    return (
      this.uploadMode === 'onSave' &&
      (this.stagedFiles.length > 0 || this.stagedDeletes.size > 0)
    );
  }

  public setCover(url: string | null) {
    this.selectedCoverUrl = url;
  }

  public getCoverUrl(): string | undefined {
    return this.selectedCoverUrl ?? undefined;
  }

  resetStagedDeletes() {
    this.stagedDeletes.clear();
    this.stagedDeleteUrls.clear();
    this.load();
  }

  public markSaved(): void {
    this.stagedFiles = [];
    this.stagedKeys.clear();
    this.stagedDeletes.clear();
    this.stagedDeleteUrls.clear();
    this.imgUpload?.clear();
  }

  /** Apply uploads + deletions together on Save */
  public async flushPendingChanges(): Promise<void> {
    if (this.uploadMode !== 'onSave' || !this.memberId) return;

    const files = [...this.stagedFiles];
    const deleteKeys = [...this.stagedDeletes];

    this.stagedFiles = [];
    this.stagedKeys.clear();
    this.stagedDeletes.clear();

    try {
      if (deleteKeys.length) {
        const urlsToDelete = deleteKeys.map(
          (k) =>
            this.stagedDeleteUrls.get(k) ??
            this.images()
              .concat(this.videos())
              .find((m) => this.keyFromItem(m) === k)?.url ??
            k
        );

        await lastValueFrom(
          this.media.deleteManyForMember(this.memberId!, urlsToDelete)
        );

        const del = new Set(deleteKeys);
        this.images.set(
          this.images().filter((i) => !del.has(this.keyFromItem(i)))
        );
        this.videos.set(
          this.videos().filter((v) => !del.has(this.keyFromItem(v)))
        );
        for (const k of deleteKeys) this.stagedDeleteUrls.delete(k);
      }

      if (files.length) {
        await lastValueFrom(
          this.media.uploadManyForMember(this.memberId!, files)
        );
        this.imgUpload?.clear();
      }

      this.load();
    } catch (e) {
      this.stagedFiles.unshift(...files);
      for (const f of files) this.stagedKeys.add(this.key(f));
      for (const k of deleteKeys) this.stagedDeletes.add(k);
      throw e;
    }
  }

  load() {
    if (!this.memberId) return;
    this.loading.set(true);
    this.media
      .listByMember(this.memberId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          const asType = (x: MediaItem) => (x.type || '').toLowerCase();
          this.images.set(items.filter((x) => asType(x).startsWith('image/')));
          this.videos.set(items.filter((x) => asType(x).startsWith('video/')));
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.messages.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Неуспешно зареждане на медии',
          });
        },
      });
  }

  async onUploadImages(event: any) {
    if (!this.memberId) return;
    const files: File[] = event.files ?? [];

    if (this.uploadMode === 'onSave') {
      let added = 0;
      for (const f of files) {
        const k = this.key(f);
        if (!this.stagedKeys.has(k)) {
          this.stagedKeys.add(k);
          this.stagedFiles.push(f);
          added++;
        }
      }
      this.imgUpload?.clear();
      this.messages.add({
        severity: 'info',
        summary: 'OK',
        detail: added ? 'Ще се качи при Запис' : 'Няма нови файлове',
      });
      return;
    }

    try {
      await lastValueFrom(this.media.uploadManyForMember(this.memberId, files));
      this.imgUpload?.clear();
      this.messages.add({
        severity: 'success',
        summary: 'OK',
        detail: 'Качено',
      });
      this.load();
    } catch {
      this.messages.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Качването се провали',
      });
    }
  }

  async onUploadVideos(event: any) {
    if (!this.memberId) return;
    const files: File[] = event.files ?? [];

    if (this.uploadMode === 'onSave') {
      this.stagedFiles.push(...files);
      this.messages.add({
        severity: 'info',
        summary: 'OK',
        detail: 'Ще се качи при Запис',
      });
      return;
    }

    try {
      await lastValueFrom(this.media.uploadManyForMember(this.memberId, files));
      this.messages.add({
        severity: 'success',
        summary: 'OK',
        detail: 'Качено',
      });
      this.load();
    } catch {
      this.messages.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Качването се провали',
      });
    }
  }

  streamUrl(item: MediaItem): string {
    return this.media.streamUrlForPath(item.url);
  }

  onRemove(e: any) {
    const f: File = e.file;
    const k = this.key(f);
    this.stagedFiles = this.stagedFiles.filter((x) => this.key(x) !== k);
    this.stagedKeys.delete(k);
  }

  onClear() {
    this.imgUpload?.clear();
  }

  removeImage(item: MediaItem) {
    const k = this.keyFromItem(item);
    if (!this.stagedDeletes.has(k)) this.stagedDeletes.add(k);
    this.stagedDeleteUrls.set(k, item.url);
    this.images.set(this.images().filter((i) => this.keyFromItem(i) !== k));
  }

  removeVideo(item: MediaItem) {
    const k = this.keyFromItem(item);
    if (!this.stagedDeletes.has(k)) this.stagedDeletes.add(k);
    this.stagedDeleteUrls.set(k, item.url);
    this.videos.set(this.videos().filter((v) => this.keyFromItem(v) !== k));
  }

  posterUrl(item: MediaItem): string {
    const posterPath = item.url.replace(/(\.\w+)$/, '_poster.jpg');
    return this.media.streamUrlForPath(posterPath);
  }
}

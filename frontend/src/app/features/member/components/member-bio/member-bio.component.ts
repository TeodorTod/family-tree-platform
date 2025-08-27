import {
  Component,
  Input,
  OnInit,
  inject,
  signal,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { MediaService } from '../../../../core/services/media.service';
import { v4 as uuid } from 'uuid';
import { SHARED_ANGULAR_IMPORTS } from '../../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../../shared/imports/shared-primeng-imports';
import { MemberNote } from '../../../../shared/models/member-note.model';
import { MemberProfile } from '../../../../shared/models/member-profile.model';
import { firstValueFrom } from 'rxjs';
import { CONSTANTS } from '../../../../shared/constants/constants';
import { TranslateService } from '@ngx-translate/core';

type QuillInstance = any;

@Component({
  selector: 'app-member-bio',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './member-bio.component.html',
  styleUrls: ['./member-bio.component.scss'],
})
export class MemberBioComponent implements OnInit, OnChanges {
  @Input({ required: true }) role!: string;
  @Input() memberId: string | null = null;
  @Input() profile: MemberProfile | null = null;

  private mediaApi = inject(MediaService);
  private fb = inject(FormBuilder);
  private confirm = inject(ConfirmationService);
  private translateService = inject(TranslateService);

  CONSTANTS = CONSTANTS;
  form!: FormGroup;
  notes = signal<MemberNote[]>([]);

  noteDialogVisible = signal(false);
  editingNoteIndex: number | null = null;
  noteTitle = signal<string>('');
  noteHtml = signal<string>('');

  private mainQuill?: QuillInstance;
  private noteQuill?: QuillInstance;

  ngOnInit(): void {
    this.form = this.fb.group({ bioHtml: [''] });
    this.hydrateFromInputs();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['profile'] || changes['memberId']) {
      this.hydrateFromInputs();
    }
  }

  private hydrateFromInputs() {
    const bio = this.profile?.bio ?? '';
    if (this.form && this.form.get('bioHtml')?.value !== bio) {
      this.form.patchValue({ bioHtml: bio }, { emitEvent: false });
    }

    if (Array.isArray(this.profile?.notes)) {
      const mapped = (this.profile!.notes as any[]).map((x) => ({
        id: x.id ?? uuid(),
        title: x.title ?? 'Untitled',
        contentHtml: x.contentHtml ?? '',
        createdAt: x.createdAt ?? new Date().toISOString(),
        updatedAt: x.updatedAt ?? new Date().toISOString(),
      })) as MemberNote[];
      this.notes.set(mapped);
    } else {
      this.notes.set([]);
    }
  }

  getValue() {
    return {
      bio: (this.form.value.bioHtml ?? '') as string,
      notes: this.notes().map((n) => ({
        id: n.id,
        title: n.title,
        contentHtml: n.contentHtml,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })),
    };
  }

  openAddNote() {
    this.editingNoteIndex = null;
    this.noteTitle.set('');
    this.noteHtml.set('');
    this.noteDialogVisible.set(true);
    setTimeout(() => this.attachNoteImageHandler(), 0);
  }

  openEditNote(idx: number) {
    const n = this.notes()[idx];
    this.editingNoteIndex = idx;
    this.noteTitle.set(n.title ?? '');
    this.noteHtml.set(n.contentHtml ?? '');
    this.noteDialogVisible.set(true);
    setTimeout(() => this.attachNoteImageHandler(), 0);
  }

  saveNoteFromDialog() {
    const now = new Date().toISOString();
    if (this.editingNoteIndex === null) {
      this.notes.update((arr) => [
        ...arr,
        {
          id: uuid(),
          title: this.noteTitle(),
          contentHtml: this.noteHtml(),
          createdAt: now,
          updatedAt: now,
        },
      ]);
    } else {
      this.notes.update((arr) => {
        const copy = [...arr];
        copy[this.editingNoteIndex!] = {
          ...copy[this.editingNoteIndex!],
          title: this.noteTitle(),
          contentHtml: this.noteHtml(),
          updatedAt: now,
        };
        return copy;
      });
    }
    this.noteDialogVisible.set(false);
  }

deleteNote(idx: number) {
  this.confirm.confirm({
    header: this.translateService.instant(CONSTANTS.BIO_DELETE_NOTE),
    message: this.translateService.instant(CONSTANTS.BIO_ACTION_NOT_UNDONE) + '?',
    icon: 'pi pi-exclamation-triangle',

    acceptLabel: this.translateService.instant(CONSTANTS.INFO_DELETE), 
    rejectLabel: this.translateService.instant(CONSTANTS.INFO_CANCEL), 

    acceptButtonStyleClass: 'p-button-danger',
    rejectButtonStyleClass: 'p-button-secondary',
    defaultFocus: 'reject',

    accept: () => {
      this.notes.update(arr => arr.filter((_, i) => i !== idx));
    },
  });
}

  moveNote(idx: number, dir: -1 | 1) {
    const arr = [...this.notes()];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    this.notes.set(arr);
  }

  onMainEditorInit(quill: QuillInstance) {
    this.mainQuill = quill;
    this.attachImageHandler(quill);
  }

  private attachNoteImageHandler() {
    setTimeout(() => {
      const editors = document.querySelectorAll('.note-editor .ql-container');
    }, 0);
  }

  onNoteEditorInit(quill: QuillInstance) {
    this.noteQuill = quill;
    this.attachImageHandler(quill, true);
  }

  private attachImageHandler(quill: QuillInstance, isNote = false) {
    const toolbar = quill.getModule('toolbar');
    if (!toolbar) return;
    toolbar.addHandler('image', () => this.handleImageInsert(quill, isNote));
  }

  private async handleImageInsert(quill: QuillInstance, isNote: boolean) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';

  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    try {
      let imageUrl: string | null = null;

      if (this.memberId) {
        const res = await firstValueFrom(
          this.mediaApi.uploadForMember(this.memberId, file)
        );
        imageUrl = res?.url ?? null;
      }

      if (!imageUrl) {
        const buf = await file.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        imageUrl = `data:${file.type};base64,${b64}`;
      }

      const range = quill.getSelection(true);
      const index = range ? range.index : 0;
      quill.insertEmbed(index, 'image', imageUrl, 'user');
      quill.setSelection(index + 1, 0, 'silent');
    } catch (e) {
      console.error('Image upload/insert failed', e);
    }
  };

  input.click();
}


  setNoteHtml(v: string) {
    this.noteHtml.set(v);
  }
}

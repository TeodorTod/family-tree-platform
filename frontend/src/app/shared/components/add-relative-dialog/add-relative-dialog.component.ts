import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { SHARED_ANGULAR_IMPORTS } from '../../imports/shared-angular-imports';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { FamilyMember } from '../../../shared/models/family-member.model';
import { Gender } from '../../../shared/enums/gender.enum';
import { BirthDeathDateMode } from '../../../shared/enums/birth-death-date.enum';
import { TranslateService } from '@ngx-translate/core';
import { CONSTANTS } from '../../constants/constants';
import { FamilyService } from '../../../core/services/family.service';
import { SharingApiService } from '../../../core/services/sharing-api.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AddRelativeFormGroup,
  AddRelativeImportedOption,
  ImportedPatchSource,
} from './add-relative-dialog.types';
import { ShareRequestStatus } from '../../enums/share-request-status.enum';

@Component({
  selector: 'app-add-relative-dialog',
  templateUrl: './add-relative-dialog.component.html',
  styleUrls: ['./add-relative-dialog.component.scss'],
  imports: [
    ...SHARED_ANGULAR_IMPORTS,
    DialogModule,
    CheckboxModule,
    SelectModule,
    DatePickerModule,
    InputTextModule,
    ButtonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddRelativeDialogComponent implements OnInit {
  baseMember = input<Partial<FamilyMember> | null>(null);
  visible = input(false);
  clonedMemberId = input<string | null>(null);
  close = output<void>();
  saved = output<{
    member?: Partial<FamilyMember>;
    relation: string;
    clonedMemberId?: string;
    approvedRequestId?: string;
  }>();

  form!: AddRelativeFormGroup;
  selectedRelation = signal<string | null>(null);
  CONSTANTS = CONSTANTS;

  private fb = inject(FormBuilder);
  private translate = inject(TranslateService);
  private familyService = inject(FamilyService);
  private family = inject(FamilyService);
  private sharing = inject(SharingApiService);
  private destroyRef = inject(DestroyRef);
  importedOptions = signal<AddRelativeImportedOption[]>([]);
  showImported = signal(false);

  private genderLabels = this.createLabelSignal([
    CONSTANTS.GENDER_MALE,
    CONSTANTS.GENDER_FEMALE,
    CONSTANTS.GENDER_OTHER,
  ]);
  genderOptions = computed(() => {
    const labels = this.genderLabels();
    return [
      { label: labels[CONSTANTS.GENDER_MALE], value: Gender.MALE },
      { label: labels[CONSTANTS.GENDER_FEMALE], value: Gender.FEMALE },
      { label: labels[CONSTANTS.GENDER_OTHER], value: Gender.OTHER },
    ];
  });

  private dobLabels = this.createLabelSignal([
    CONSTANTS.INFO_DATE_OF_BIRTH,
    CONSTANTS.INFO_DOB_YEAR_ONLY,
    CONSTANTS.INFO_DOB_NOTE_LABEL,
  ]);
  dobModeOptions = computed(() => {
    const labels = this.dobLabels();
    return [
      {
        label: labels[CONSTANTS.INFO_DATE_OF_BIRTH],
        value: BirthDeathDateMode.EXACT,
      },
      {
        label: labels[CONSTANTS.INFO_DOB_YEAR_ONLY],
        value: BirthDeathDateMode.YEAR,
      },
      {
        label: labels[CONSTANTS.INFO_DOB_NOTE_LABEL],
        value: BirthDeathDateMode.NOTE,
      },
    ];
  });

  private dodLabels = this.createLabelSignal([
    CONSTANTS.INFO_DATE_OF_DEATH,
    CONSTANTS.INFO_DOD_YEAR_ONLY,
    CONSTANTS.INFO_DOD_NOTE_LABEL,
  ]);
  dodModeOptions = computed(() => {
    const labels = this.dodLabels();
    return [
      {
        label: labels[CONSTANTS.INFO_DATE_OF_DEATH],
        value: BirthDeathDateMode.EXACT,
      },
      {
        label: labels[CONSTANTS.INFO_DOD_YEAR_ONLY],
        value: BirthDeathDateMode.YEAR,
      },
      {
        label: labels[CONSTANTS.INFO_DOD_NOTE_LABEL],
        value: BirthDeathDateMode.NOTE,
      },
    ];
  });

  private relationLabels = this.createLabelSignal([
    CONSTANTS.RELATION_MOTHER,
    CONSTANTS.RELATION_FATHER,
    CONSTANTS.RELATION_BROTHER,
    CONSTANTS.RELATION_SISTER,
    CONSTANTS.RELATION_PARTNER,
    CONSTANTS.RELATION_SON,
    CONSTANTS.RELATION_DAUGHTER,
  ]);
  relationOptions = computed(() => {
    const labels = this.relationLabels();
    const role = this.baseMember()?.role ?? '';
    const isDeepOrLateral =
      role.includes('_sister___') || role.includes('_brother___');
    const options = [
      {
        label: labels[CONSTANTS.RELATION_MOTHER],
        value: 'mother',
      },
      {
        label: labels[CONSTANTS.RELATION_FATHER],
        value: 'father',
      },
      {
        label: labels[CONSTANTS.RELATION_BROTHER],
        value: 'brother',
      },
      {
        label: labels[CONSTANTS.RELATION_SISTER],
        value: 'sister',
      },
      {
        label: labels[CONSTANTS.RELATION_PARTNER],
        value: 'partner',
      },
      { label: labels[CONSTANTS.RELATION_SON], value: 'son' },
      {
        label: labels[CONSTANTS.RELATION_DAUGHTER],
        value: 'daughter',
      },
    ];
    return options.filter(
      (opt) =>
        !(isDeepOrLateral && (opt.value === 'mother' || opt.value === 'father'))
    );
  });

  ngOnInit(): void {
    const initialClonedId = this.clonedMemberId();
    this.form = this.buildForm(initialClonedId);
    this.showImported.set(this.form.controls.useImported.value);
    this.form.controls.useImported.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => this.showImported.set(!!v));

    this.familyService
      .onSubscriptionLimitReached()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.visible()) {
          this.close.emit();
        }
      });

    this.sharing
      .getOutgoingRequests()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((reqs) => {
        const options: AddRelativeImportedOption[] = (reqs || [])
          .filter((r) => r.status === ShareRequestStatus.Approved)
          .map((r) => ({
            label: `${r.target.firstName ?? ''} ${
              r.target.lastName ?? ''
            }`.trim(),
            value: r.id,
            meta: r.target,
          }));
        this.importedOptions.set(options);
      });

    if (initialClonedId) {
      this.family
        .getFamilyMemberById(initialClonedId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((member: Partial<FamilyMember>) => {
          const patch = this.buildImportedPatch({
            firstName: member.firstName ?? null,
            middleName: member.middleName ?? null,
            lastName: member.lastName ?? null,
            dob: member.dob ?? null,
            birthYear: member.birthYear ?? null,
            birthNote: member.birthNote ?? null,
            dod: member.dod ?? null,
            deathYear: member.deathYear ?? null,
            deathNote: member.deathNote ?? null,
          });
          this.form.patchValue(patch, { emitEvent: false });
        });
      return;
    }
    // Prefill defaults
    this.form.patchValue(
      {
        lastName: this.baseMember()?.lastName ?? null,
        dobMode: BirthDeathDateMode.EXACT,
      },
      { emitEvent: false }
    );

    this.form
      .get('importedId')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        const opt = this.importedOptions().find((o) => o.value === id);
        if (!opt) return;
        const patch = this.buildImportedPatch({
          firstName: opt.meta.firstName ?? null,
          lastName: opt.meta.lastName ?? null,
          dob: opt.meta.dob ?? null,
          birthYear: opt.meta.birthYear ?? null,
          dod: opt.meta.dod ?? null,
          deathYear: opt.meta.deathYear ?? null,
        });
        this.form.patchValue(patch, { emitEvent: false });
      });
  }

  onDobYearPicked(d: Date) {
    if (!d) return;
    this.form.get('birthYear')?.setValue(d.getFullYear());
  }

  onCancel() {
    this.close.emit();
  }

  onVisibleChange(next: boolean) {
    if (!next) {
      this.onCancel();
    }
  }

  onSave() {
    if (this.form.invalid) return;
    const val = this.form.value;
    const clonedId = this.clonedMemberId();
    const selectedImported = val.importedId as string | null;
    if (!val.relation) {
      return;
    }

    if (clonedId || selectedImported) {
      const dobPayload = this.familyService.buildDobPayload(this.form);
      const dodPayload = this.familyService.buildDodPayload(this.form);
      const member: Partial<FamilyMember> = {
        firstName: val.firstName ?? undefined,
        middleName: val.middleName ?? undefined,
        lastName: val.lastName ?? undefined,
        dob: dobPayload.dob ? new Date(dobPayload.dob) : null,
        birthYear: dobPayload.birthYear ?? null,
        birthNote: dobPayload.birthNote ?? null,
        isAlive: val.isAlive ?? true,
        dod: dodPayload.dod ? new Date(dodPayload.dod) : null,
        deathYear: dodPayload.deathYear ?? null,
        deathNote: dodPayload.deathNote ?? null,
      };
      this.saved.emit({
        relation: val.relation,
        clonedMemberId: clonedId ?? undefined,
        approvedRequestId: selectedImported ?? undefined,
        member,
      });
    } else {
      const dobPayload = this.familyService.buildDobPayload(this.form);
      const member: Partial<FamilyMember> = {
        firstName: val.firstName ?? undefined,
        middleName: val.middleName ?? undefined,
        lastName: val.lastName ?? undefined,
        gender: val.gender ?? undefined,
        dob: dobPayload.dob ? new Date(dobPayload.dob) : null,
        birthYear: dobPayload.birthYear ?? null,
        birthNote: dobPayload.birthNote ?? null,
        isAlive: true,
      };
      this.saved.emit({ member, relation: val.relation });
    }
    this.form.reset();
    // Keep some sensible defaults after reset
    this.form.patchValue({
      lastName: this.baseMember()?.lastName ?? null,
      dobMode: BirthDeathDateMode.EXACT,
    });
  }

  useImported(): boolean {
    return this.showImported();
  }

  private buildImportedPatch(
    source: ImportedPatchSource
  ): Partial<AddRelativeFormGroup['value']> {
    return {
      firstName: source.firstName ?? null,
      middleName: source.middleName ?? null,
      lastName: source.lastName ?? null,
      isAlive: false,
      ...this.buildBirthPatch(source),
      ...this.buildDeathPatch(source),
    };
  }

  private buildBirthPatch(
    source: ImportedPatchSource
  ): Partial<AddRelativeFormGroup['value']> {
    const dob = this.toDate(source.dob);
    const birthYear = this.toYear(source.birthYear);
    const birthNote = (source.birthNote ?? '').trim();

    if (dob) {
      return {
        dobMode: BirthDeathDateMode.EXACT,
        dob,
        birthYear: null,
        birthNote: null,
      };
    }

    if (birthYear !== null) {
      return {
        dobMode: BirthDeathDateMode.YEAR,
        dob: new Date(Date.UTC(birthYear, 0, 1)),
        birthYear,
        birthNote: null,
      };
    }

    if (birthNote) {
      return {
        dobMode: BirthDeathDateMode.NOTE,
        dob: null,
        birthYear: null,
        birthNote,
      };
    }

    return { dob: null, birthYear: null, birthNote: null };
  }

  private buildDeathPatch(
    source: ImportedPatchSource
  ): Partial<AddRelativeFormGroup['value']> {
    const dod = this.toDate(source.dod);
    const deathYear = this.toYear(source.deathYear);
    const deathNote = (source.deathNote ?? '').trim();

    if (dod) {
      return {
        dodMode: BirthDeathDateMode.EXACT,
        dod,
        deathYear: null,
        deathNote: null,
      };
    }

    if (deathYear !== null) {
      return {
        dodMode: BirthDeathDateMode.YEAR,
        dod: new Date(Date.UTC(deathYear, 0, 1)),
        deathYear,
        deathNote: null,
      };
    }

    if (deathNote) {
      return {
        dodMode: BirthDeathDateMode.NOTE,
        dod: null,
        deathYear: null,
        deathNote,
      };
    }

    return { dod: null, deathYear: null, deathNote: null };
  }

  private toDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private toYear(value: number | null | undefined): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    return Math.trunc(value);
  }

  private createLabelSignal(keys: string[]) {
    const initial = this.instantLabelRecord(keys);
    const labels = signal(initial);
    this.translate
      .stream(keys)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => labels.set(value as Record<string, string>));
    return labels.asReadonly();
  }

  private instantLabelRecord(keys: string[]) {
    return keys.reduce<Record<string, string>>((acc, key) => {
      acc[key] = this.translate.instant(key);
      return acc;
    }, {});
  }

  private buildForm(initialClonedId: string | null): AddRelativeFormGroup {
    return this.familyService.createFamilyMemberForm({
      destroyRef: this.destroyRef,
      extraControls: {
        relation: new FormControl<string | null>(null, Validators.required),
        useImported: this.fb.nonNullable.control(!!initialClonedId),
        importedId: new FormControl<string | null>(initialClonedId ?? null),
      },
    });
  }
}

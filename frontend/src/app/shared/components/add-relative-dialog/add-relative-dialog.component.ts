import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { SHARED_ANGULAR_IMPORTS } from '../../imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../imports/shared-primeng-imports';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { FamilyMember } from '../../../shared/models/family-member.model';
import { Gender } from '../../../shared/enums/gender.enum';
import { BirthDeathDateMode } from '../../../shared/enums/birth-death-date.enum';
import { TranslateService } from '@ngx-translate/core';
import { CONSTANTS } from '../../constants/constants';
import { FamilyService } from '../../../core/services/family.service';
import { SharingApiService } from '../../../core/services/sharing-api.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AddRelativeFormGroup } from './add-relative-dialog.types';

@Component({
  selector: 'app-add-relative-dialog',
  templateUrl: './add-relative-dialog.component.html',
  styleUrls: ['./add-relative-dialog.component.scss'],
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddRelativeDialogComponent implements OnInit {
  baseMember = input<FamilyMember | null>(null);
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
  relationOptions: { label: string; value: string }[] = [];
  CONSTANTS = CONSTANTS;

  private fb = inject(FormBuilder);
  private translate = inject(TranslateService);
  private familyService = inject(FamilyService);
  private family = inject(FamilyService);
  private sharing = inject(SharingApiService);
  private destroyRef = inject(DestroyRef);
  importedOptions = signal<{ label: string; value: string; meta: { firstName?: string; lastName?: string; birthYear?: number | null; deathYear?: number | null } }[]>([]);
  showImported = signal(false);

  genderOptions = [
    {
      label: this.translate.instant(CONSTANTS.GENDER_MALE),
      value: Gender.MALE,
    },
    {
      label: this.translate.instant(CONSTANTS.GENDER_FEMALE),
      value: Gender.FEMALE,
    },
    {
      label: this.translate.instant(CONSTANTS.GENDER_OTHER),
      value: Gender.OTHER,
    },
  ];

  // For the DOB mode dropdown
  dobModeOptions = [
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

  dodModeOptions = [
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

  ngOnInit(): void {
    const initialClonedId = this.clonedMemberId();
    this.form = this.buildForm(initialClonedId);
    this.showImported.set(this.form.controls.useImported.value);
    this.form.controls.useImported.valueChanges.subscribe((v) => this.showImported.set(!!v));

    this.familyService
      .onSubscriptionLimitReached()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.visible()) {
          this.close.emit();
        }
      });

    this.sharing.getOutgoingRequests().subscribe((reqs) => {
      const list = (reqs || [])
        .filter((r: any) => r.status === 'APPROVED')
        .map((r: any) => ({
          label: `${r.target?.firstName ?? ''} ${r.target?.lastName ?? ''}`.trim(),
          value: r.id,
          meta: { firstName: r.target?.firstName, lastName: r.target?.lastName, birthYear: r.target?.birthYear ?? null, deathYear: r.target?.deathYear ?? null },
        }));
      this.importedOptions.set(list);
    });

    if (initialClonedId) {
      this.family.getFamilyMemberById(initialClonedId).subscribe((m: any) => {
        this.form.patchValue({
          firstName: m?.firstName ?? null,
          middleName: m?.middleName ?? null,
          lastName: m?.lastName ?? null,
        });
      });
      return;
    }
    const role = this.baseMember()?.role ?? '';
    const isDeepOrLateral =
      role.includes('_sister___') || role.includes('_brother___');

    this.relationOptions = [
      {
        label: this.translate.instant(CONSTANTS.RELATION_MOTHER),
        value: 'mother',
      },
      {
        label: this.translate.instant(CONSTANTS.RELATION_FATHER),
        value: 'father',
      },
      {
        label: this.translate.instant(CONSTANTS.RELATION_BROTHER),
        value: 'brother',
      },
      {
        label: this.translate.instant(CONSTANTS.RELATION_SISTER),
        value: 'sister',
      },
      {
        label: this.translate.instant(CONSTANTS.RELATION_PARTNER),
        value: 'partner',
      },
      { label: this.translate.instant(CONSTANTS.RELATION_SON), value: 'son' },
      {
        label: this.translate.instant(CONSTANTS.RELATION_DAUGHTER),
        value: 'daughter',
      },
    ].filter(
      (opt) =>
        !(isDeepOrLateral && (opt.value === 'mother' || opt.value === 'father'))
    );

    this.genderOptions = [
      {
        label: this.translate.instant(CONSTANTS.GENDER_MALE),
        value: Gender.MALE,
      },
      {
        label: this.translate.instant(CONSTANTS.GENDER_FEMALE),
        value: Gender.FEMALE,
      },
      {
        label: this.translate.instant(CONSTANTS.GENDER_OTHER),
        value: Gender.OTHER,
      },
    ];

    // Prefill defaults
    this.form.patchValue(
      {
        lastName: this.baseMember()?.lastName ?? null,
        dobMode: BirthDeathDateMode.EXACT,
      },
      { emitEvent: false }
    );

    this.form.get('importedId')?.valueChanges.subscribe((id) => {
      const opt = this.importedOptions().find((o) => o.value === id);
      if (!opt) return;
      const by = opt.meta.birthYear ?? null;
      const dy = opt.meta.deathYear ?? null;
      const patch: any = {
        firstName: opt.meta.firstName ?? null,
        lastName: opt.meta.lastName ?? null,
      };
      if (by != null) {
        patch.dobMode = BirthDeathDateMode.YEAR;
        patch.dob = new Date(Date.UTC(by, 0, 1));
      }
      if (dy != null) {
        patch.dodMode = BirthDeathDateMode.YEAR;
        patch.dod = new Date(Date.UTC(dy, 0, 1));
      }
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
      } as any;
      this.saved.emit({ relation: val.relation, clonedMemberId: clonedId ?? undefined, approvedRequestId: selectedImported ?? undefined, member });
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

  private buildForm(initialClonedId: string | null): AddRelativeFormGroup {
    const baseForm = this.familyService.createFamilyMemberForm();
    const form = baseForm as unknown as AddRelativeFormGroup;
    form.addControl(
      'relation',
      new FormControl<string | null>(null, Validators.required),
    );
    form.addControl(
      'useImported',
      this.fb.nonNullable.control(!!initialClonedId),
    );
    form.addControl(
      'importedId',
      new FormControl<string | null>(initialClonedId ?? null),
    );
    return form;
  }
}

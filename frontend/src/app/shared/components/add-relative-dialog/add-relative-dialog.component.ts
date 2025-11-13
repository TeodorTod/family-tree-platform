import {
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { SHARED_ANGULAR_IMPORTS } from '../../imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../imports/shared-primeng-imports';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { FamilyMember } from '../../../shared/models/family-member.model';
import { Gender } from '../../../shared/enums/gender.enum';
import { TranslateService } from '@ngx-translate/core';
import { CONSTANTS } from '../../constants/constants';
import { FamilyService } from '../../../core/services/family.service';
import { SharingApiService } from '../../../core/services/sharing-api.service';

@Component({
  selector: 'app-add-relative-dialog',
  standalone: true,
  templateUrl: './add-relative-dialog.component.html',
  styleUrls: ['./add-relative-dialog.component.scss'],
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
})
export class AddRelativeDialogComponent implements OnInit {
  @Input() baseMember!: FamilyMember;
  @Input() visible = false;
  @Input() clonedMemberId: string | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<{
    member?: Partial<FamilyMember>;
    relation: string;
    clonedMemberId?: string;
    approvedRequestId?: string;
  }>();

  form!: FormGroup;
  selectedRelation = signal<string | null>(null);
  relationOptions: { label: string; value: string }[] = [];
  CONSTANTS = CONSTANTS;

  private fb = inject(FormBuilder);
  private translate = inject(TranslateService);
  private familyService = inject(FamilyService);
  private family = inject(FamilyService);
  private sharing = inject(SharingApiService);
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
      value: 'exact' as const,
    },
    {
      label: this.translate.instant(CONSTANTS.INFO_DOB_YEAR_ONLY),
      value: 'year' as const,
    },
    {
      label: this.translate.instant(CONSTANTS.INFO_DOB_NOTE_LABEL),
      value: 'note' as const,
    },
  ];

  dodModeOptions = [
    {
      label: this.translate.instant(CONSTANTS.INFO_DATE_OF_DEATH),
      value: 'exact' as const,
    },
    {
      label: this.translate.instant(CONSTANTS.INFO_DOD_YEAR_ONLY),
      value: 'year' as const,
    },
    {
      label: this.translate.instant(CONSTANTS.INFO_DOD_NOTE_LABEL),
      value: 'note' as const,
    },
  ];

  ngOnInit(): void {
    this.form = this.familyService.createFamilyMemberForm() as FormGroup<any>;
    this.form.addControl(
      'relation',
      new FormControl<string | null>(null, Validators.required)
    );
    this.form.addControl('useImported', new FormControl<boolean>(!!this.clonedMemberId, { nonNullable: true }));
    this.form.addControl('importedId', new FormControl<string | null>(this.clonedMemberId ?? null));
    this.showImported.set(!!this.clonedMemberId);
    this.form.get('useImported')?.valueChanges.subscribe((v) => this.showImported.set(!!v));

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

    if (this.clonedMemberId) {
      this.family.getFamilyMemberById(this.clonedMemberId).subscribe((m: any) => {
        this.form.patchValue({
          firstName: m?.firstName ?? null,
          middleName: m?.middleName ?? null,
          lastName: m?.lastName ?? null,
        });
      });
      return;
    }
    const role = this.baseMember?.role ?? '';
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
        lastName: this.baseMember?.lastName ?? null,
        dobMode: 'exact', // exact | year | note (service has validators tied to this)
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
        patch.dobMode = 'year';
        patch.dob = new Date(Date.UTC(by, 0, 1));
      }
      if (dy != null) {
        patch.dodMode = 'year';
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
    const selectedImported = val.importedId as string | null;
    if (this.clonedMemberId || selectedImported) {
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
      this.saved.emit({ relation: val.relation, clonedMemberId: this.clonedMemberId ?? undefined, approvedRequestId: selectedImported ?? undefined, member });
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
      lastName: this.baseMember?.lastName ?? null,
      dobMode: 'exact',
    });
  }

  useImported(): boolean {
    return this.showImported();
  }
}

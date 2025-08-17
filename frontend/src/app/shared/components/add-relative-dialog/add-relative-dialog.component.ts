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
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<{
    member: Partial<FamilyMember>;
    relation: string;
  }>();

  form!: FormGroup;
  selectedRelation = signal<string | null>(null);
  relationOptions: { label: string; value: string }[] = [];
  CONSTANTS = CONSTANTS;

  private fb = inject(FormBuilder);
  private translate = inject(TranslateService);
  private familyService = inject(FamilyService);

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

  ngOnInit(): void {
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

    // 3) Base form from service (keeps DOB logic/validators consistent)
    //    Cast to FormGroup<any> so we can add the dialog-only 'relation' control.
    this.form = this.familyService.createFamilyMemberForm() as FormGroup<any>;

    // 4) Add dialog-only control
    this.form.addControl(
      'relation',
      new FormControl<string | null>(null, Validators.required)
    );

    // 5) Prefill defaults
    this.form.patchValue(
      {
        lastName: this.baseMember?.lastName ?? null,
        dobMode: 'exact', // exact | year | note (service has validators tied to this)
      },
      { emitEvent: false }
    );
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

    // Build dob / birthYear / birthNote according to the selected mode
    const dobPayload = this.familyService.buildDobPayload(this.form);

    const member: Partial<FamilyMember> = {
      firstName: val.firstName ?? undefined,
      middleName: val.middleName ?? undefined,
      lastName: val.lastName ?? undefined,
      gender: val.gender ?? undefined,

      // Optional DOB variants:
      dob: dobPayload.dob ? new Date(dobPayload.dob) : null,
      birthYear: dobPayload.birthYear ?? null,
      birthNote: dobPayload.birthNote ?? null,

      isAlive: true,
    };

    this.saved.emit({ member, relation: val.relation });
    this.form.reset();
    // Keep some sensible defaults after reset
    this.form.patchValue({
      lastName: this.baseMember?.lastName ?? null,
      dobMode: 'exact',
    });
  }
}

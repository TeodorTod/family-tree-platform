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
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FamilyMember } from '../../../shared/models/family-member.model';
import { Gender } from '../../../shared/enums/gender.enum';
import { TranslateService } from '@ngx-translate/core';
import { CONSTANTS } from '../../constants/constants';

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
  CONSTANTS = CONSTANTS;

  private fb = inject(FormBuilder);
  private translate = inject(TranslateService);

  relationOptions = [
    { label: this.translate.instant(CONSTANTS.RELATION_BROTHER), value: 'brother' },
    { label: this.translate.instant(CONSTANTS.RELATION_SISTER), value: 'sister' },
    { label: this.translate.instant(CONSTANTS.RELATION_PARTNER), value: 'partner' },
    { label: this.translate.instant(CONSTANTS.RELATION_SON), value: 'son' },
    { label: this.translate.instant(CONSTANTS.RELATION_DAUGHTER), value: 'daughter' },
  ];

  genderOptions = [
    { label: this.translate.instant(CONSTANTS.GENDER_MALE), value: Gender.MALE },
    { label: this.translate.instant(CONSTANTS.GENDER_FEMALE), value: Gender.FEMALE },
    { label: this.translate.instant(CONSTANTS.GENDER_OTHER), value: Gender.OTHER },
  ];

  ngOnInit(): void {
    this.form = this.fb.group({
      firstName: [null, Validators.required],
      middleName: [null],
      lastName: [this.baseMember?.lastName ?? '', Validators.required],
      gender: [null, Validators.required],
      dob: [null, Validators.required],
      relation: [null, Validators.required],
    });
  }

  onCancel() {
    this.close.emit();
  }

  onSave() {
    if (this.form.invalid) return;

    const val = this.form.value;
    const member: Partial<FamilyMember> = {
      firstName: val.firstName,
      middleName: val.middleName,
      lastName: val.lastName,
      gender: val.gender,
      dob: val.dob,
      isAlive: true,
    };

    this.saved.emit({ member, relation: val.relation });
    this.form.reset();
  }
}

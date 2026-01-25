import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnChanges,
  SimpleChanges,
  signal,
  inject,
  input,
} from '@angular/core';
import { SHARED_ANGULAR_IMPORTS } from '../../../../shared/imports/shared-angular-imports';
import { CardModule } from 'primeng/card';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { MemberProfileService } from '../../../../core/services/member-profile.service';
import { MemberProfile } from '../../../../shared/models/member-profile.model';
import { take } from 'rxjs/operators';
import { of, switchMap } from 'rxjs';
import { CONSTANTS } from '../../../../shared/constants/constants';
import { BloodType } from '../../../../shared/enums/blood-type.enum';
import { Handedness } from '../../../../shared/enums/handedness.enum';
import { SmokingStatus } from '../../../../shared/enums/smoking-status.enum';

@Component({
  selector: 'app-member-personal-info',
  imports: [
    ...SHARED_ANGULAR_IMPORTS,
    CardModule,
    DatePickerModule,
    InputNumberModule,
    SelectModule,
    InputTextModule,
    TextareaModule,
  ],
  templateUrl: './member-personal-info.component.html',
  styleUrls: ['./member-personal-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberPersonalInfoComponent implements OnInit, OnChanges {
  role = input.required<string>();

  private profileSvc = inject(MemberProfileService);

  CONSTANTS = CONSTANTS;

  bloodTypes = Object.values(BloodType);
  handednessOptions = Object.values(Handedness);
  smokingOptions = Object.values(SmokingStatus);

  form = this.profileSvc.createPersonalInfoForm();

  private initialSnapshot = '{}';
  personal = signal<MemberProfile['personalInfo'] | null>(null);

  ngOnInit(): void {
    this.hydrate();
  }

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['role'] && !ch['role'].firstChange) this.hydrate();
  }

  private hydrate() {
    const role = this.role();
    if (!role) return;
    this.profileSvc
      .getProfileByRole(role)
      .pipe(
        take(1),
        switchMap((p) => of(p?.personalInfo ?? null))
      )
      .subscribe((pi) => {
        this.personal.set(pi);
        this.applyToForm(pi);
        this.snapshot();
      });
  }

  private applyToForm(pi: any | null) {
    const d = (s?: string | null) =>
      s && /^\d{4}-\d{2}-\d{2}/.test(s) ? new Date(s) : null;

    this.form.reset({
      religion: pi?.religion ?? null,
      nameDay: d(pi?.nameDay ?? null),
      heightCm: this.toNumberOrNull(pi?.heightCm),
      weightKg: this.toNumberOrNull(pi?.weightKg),
      bloodType: (pi?.bloodType ?? null) as BloodType | null,
      handedness: (pi?.handedness ?? null) as Handedness | null,
      smokingStatus: (pi?.smokingStatus ?? null) as SmokingStatus | null,
      allergies: pi?.allergies ?? null,
      conditions: pi?.conditions ?? null,
      phone: pi?.phone ?? null,
      email: pi?.email ?? null,
      website: pi?.website ?? null,
      address: pi?.address ?? null,
      notes: pi?.notes ?? null,
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private toNumberOrNull(v: any): number | null {
    const n = typeof v === 'string' ? Number(v) : v;
    return Number.isFinite(n) ? n : null;
  }

  private snapshot() {
    this.initialSnapshot = JSON.stringify(this.getValue());
  }

  getValue(): Record<string, any> {
    const v = this.form.getRawValue();
    return {
      religion: (v.religion ?? '')?.trim() || null,
      nameDay: v.nameDay
        ? new Date(v.nameDay).toISOString().slice(0, 10)
        : null,
      heightCm: v.heightCm ?? null,
      weightKg: v.weightKg ?? null,
      bloodType: v.bloodType ?? null,
      handedness: v.handedness ?? null,
      smokingStatus: v.smokingStatus ?? null,
      allergies: (v.allergies ?? '')?.trim() || null,
      conditions: (v.conditions ?? '')?.trim() || null,
      phone: (v.phone ?? '')?.trim() || null,
      email: (v.email ?? '')?.trim() || null,
      website: (v.website ?? '')?.trim() || null,
      address: (v.address ?? '')?.trim() || null,
      notes: (v.notes ?? '')?.trim() || null,
    };
  }

  hasUnsavedChanges(): boolean {
    return JSON.stringify(this.getValue()) !== this.initialSnapshot;
  }

  markSaved(): void {
    this.snapshot();
  }
}

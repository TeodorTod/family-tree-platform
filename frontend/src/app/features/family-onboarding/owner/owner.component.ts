import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../shared/imports/shared-primeng-imports';
import { FamilyService } from '../../../core/services/family.service';
import { FamilyStateService } from '../../../core/services/family-state.service';
import { FamilyMember } from '../../../shared/models/family-member.model';

@Component({
  selector: 'app-owner',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './owner.component.html',
  styleUrl: './owner.component.scss',
})
export class OwnerComponent implements OnInit {
  private fb = inject(FormBuilder);
  private familyService = inject(FamilyService);
  private router = inject(Router);
  private familyState = inject(FamilyStateService);

  hasExistingRecord = false;
  photoUrl: string | null = null;
  genderOptions = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' },
  ];

  form = this.fb.group<{
    firstName: FormControl<string | null>;
    middleName: FormControl<string | null>;
    lastName: FormControl<string | null>;
    gender: FormControl<string | null>;
    dob: FormControl<Date | null>;
    dod: FormControl<Date | null>;
    biography: FormControl<string | null>;
  }>({
    firstName: this.fb.control(null, Validators.required),
    middleName: this.fb.control(null),
    lastName: this.fb.control(null, Validators.required),
    gender: this.fb.control(null, Validators.required),
    dob: this.fb.control(null, Validators.required),
    dod: this.fb.control(null),
    biography: this.fb.control(null),
  });

  ngOnInit(): void {
    this.familyService.getFamilyMemberByRole('owner').subscribe((self) => {
      if (self) {
        this.hasExistingRecord = true;

        const patchData = {
          ...self,
          dob: self.dob ? new Date(self.dob) : null,
          dod: self.dod ? new Date(self.dod) : null,
        };

        this.form.patchValue(patchData);
        this.photoUrl = self.photoUrl || null;
        this.familyState.owner.set(self);
      }
    });
  }

  onPhotoUpload(event: any) {
    const file = event.files[0];
    this.familyService.uploadPhoto(file).subscribe((res) => {
      this.photoUrl = res.url;
    });
  }

  next() {
    if (this.form.invalid) return;

    const raw = this.form.value;

    const memberData: FamilyMember = {
      firstName: raw.firstName ?? '',
      middleName: raw.middleName ?? '',
      lastName: raw.lastName ?? '',
      gender: raw.gender ?? '',
      dob: raw.dob instanceof Date ? raw.dob.toISOString() : '',
      dod: raw.dod instanceof Date ? raw.dod.toISOString() : undefined,
      biography: raw.biography || undefined,
      photoUrl: this.photoUrl ?? '',
      isAlive: true,
      role: 'owner',
    };

    const save$ = this.hasExistingRecord
      ? this.familyService.updateMemberByRole('owner', memberData)
      : this.familyService.createMemberByRole('owner', memberData);

    save$.subscribe(() => {
      this.familyState.owner.set(memberData);
      this.router.navigate(['/onboarding/mother']);
    });
  }
}

import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../shared/imports/shared-primeng-imports';
import { FamilyService } from '../../../core/services/family.service';
import { FamilyStateService } from '../../../core/services/family-state.service';
import { FamilyMember } from '../../../shared/models/family-member.model';
import { Roles } from '../../../shared/enums/roles.enum';
import { Gender, GenderLabel } from '../../../shared/enums/gender.enum';

@Component({
  selector: 'app-owner',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './owner.component.html',
  styleUrl: './owner.component.scss',
})
export class OwnerComponent implements OnInit {
  private familyService = inject(FamilyService);
  private router = inject(Router);
  private familyState = inject(FamilyStateService);

  hasExistingRecord = false;
  photoUrl: string | null = null;
  genderOptions = [
    { label: GenderLabel.MALE, value: Gender.MALE },
    { label: GenderLabel.FEMALE, value: Gender.FEMALE },
    { label: GenderLabel.OTHER, value: Gender.OTHER },
  ];

  form = this.familyService.createFamilyMemberForm();

  ngOnInit(): void {
    this.familyService.getFamilyMemberByRole(Roles.OWNER).subscribe((self) => {
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
      photoUrl: this.photoUrl ?? '',
      isAlive: true,
      role: Roles.OWNER,
    };

    const save$ = this.hasExistingRecord
      ? this.familyService.updateMemberByRole(Roles.OWNER, memberData)
      : this.familyService.createMemberByRole(Roles.OWNER, memberData);

    save$.subscribe(() => {
      this.familyState.owner.set(memberData);
      this.router.navigate(['/onboarding/mother']);
    });
  }
}

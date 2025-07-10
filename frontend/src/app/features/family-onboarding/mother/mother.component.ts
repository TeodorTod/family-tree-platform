import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FamilyStateService } from '../../../core/services/family-state.service';
import { FamilyService } from '../../../core/services/family.service';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../shared/imports/shared-primeng-imports';
import { FamilyMember } from '../../../shared/models/family-member.model';

@Component({
  selector: 'app-mother',
  standalone: true,
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './mother.component.html',
  styleUrls: ['./mother.component.scss'],
})
export class MotherComponent implements OnInit {
  private fb = inject(FormBuilder);
  private familyService = inject(FamilyService);
  private router = inject(Router);
  private familyState = inject(FamilyStateService);

  photoUrl: string | null = null;
  hasExistingRecord = false;

form = this.fb.group({
  firstName: this.fb.control<string | null>(null, Validators.required),
  middleName: this.fb.control<string | null>(null),
  lastName: this.fb.control<string | null>(null, Validators.required),
  gender: this.fb.control<string | null>('female'),
  dob: this.fb.control<Date | null>(null, Validators.required),
  isAlive: this.fb.control<boolean | null>(true),
  dod: this.fb.control<Date | null>(null),
  biography: this.fb.control<string | null>(null),
});


  ngOnInit(): void {
    this.familyService.getFamilyMemberByRole('mother').subscribe((mother) => {
      if (mother) {
        this.hasExistingRecord = true;
        const patchData = {
          ...mother,
          dob: mother.dob ? new Date(mother.dob) : null,
          dod: mother.dod ? new Date(mother.dod) : null,
        };

        this.form.patchValue(patchData);
        this.photoUrl = mother.photoUrl || null;
        this.familyState.mother.set(mother);
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

    const raw = this.form.value as Required<
      Pick<
        FamilyMember,
        'firstName' | 'lastName' | 'gender' | 'dob' | 'isAlive'
      >
    > &
      Partial<FamilyMember>;

    const mother: FamilyMember = {
      ...raw,
      dod: raw.isAlive ? undefined : raw.dod || undefined,
      photoUrl: this.photoUrl || undefined,
      role: 'mother',
    };

    const save$ = this.hasExistingRecord
      ? this.familyService.updateMemberByRole('mother', mother)
      : this.familyService.createMemberByRole('mother', mother);

    save$.subscribe(() => {
      this.familyState.mother.set(mother);
      this.router.navigate(['/onboarding/maternal-grandparents']);
    });
  }

  back() {
    this.router.navigate(['/onboarding/owner']);
  }
}

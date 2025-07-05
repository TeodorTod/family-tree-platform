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
    firstName: ['', Validators.required],
    middleName: [''],
    lastName: ['', Validators.required],
    gender: ['female'],
    dob: ['', Validators.required],
    isAlive: [true],
    dod: [''],
    biography: [''],
  });

  ngOnInit(): void {
    this.familyService.getFamilyMemberByRole('mother').subscribe((mother) => {
      if (mother) {
        this.hasExistingRecord = true;
        this.form.patchValue(mother);
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

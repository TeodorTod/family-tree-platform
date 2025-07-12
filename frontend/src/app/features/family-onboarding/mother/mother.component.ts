import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FamilyStateService } from '../../../core/services/family-state.service';
import { FamilyService } from '../../../core/services/family.service';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../shared/imports/shared-primeng-imports';
import { FamilyMember } from '../../../shared/models/family-member.model';
import { CONSTANTS } from '../../../shared/constants/constants';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-mother',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './mother.component.html',
  styleUrls: ['./mother.component.scss'],
})
export class MotherComponent implements OnInit {
  CONSTANTS = CONSTANTS;
  private familyService = inject(FamilyService);
  private router = inject(Router);
  private familyState = inject(FamilyStateService);
  private destroyRef = inject(DestroyRef);

  photoUrl: string | null = null;
  hasExistingRecord = false;

  form = this.familyService.createFamilyMemberForm();

  ngOnInit(): void {
    this.familyService
      .getFamilyMemberByRole('mother')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((mother) => {
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
    this.familyService
      .uploadPhoto(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
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

    save$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.familyState.mother.set(mother);
      this.router.navigate(['/onboarding/maternal-grandparents']);
    });
  }

  back() {
    this.router.navigate(['/onboarding/owner']);
  }

  onPhotoClear() {
    this.photoUrl = null;
  }
}

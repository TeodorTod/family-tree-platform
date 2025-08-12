import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FamilyStateService } from '../../../core/services/family-state.service';
import { FamilyService } from '../../../core/services/family.service';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../shared/imports/shared-primeng-imports';
import { FamilyMember } from '../../../shared/models/family-member.model';
import { CONSTANTS } from '../../../shared/constants/constants';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';
import { Roles } from '../../../shared/enums/roles.enum';
import { switchMap, forkJoin, of } from 'rxjs';
import { PartnerStatus } from '../../../shared/enums/partner-status.enum';

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

  photoUrl = signal<string | null>(null);
  hasExistingRecord = false;
  apiUrl = environment.apiUrl;

  form = this.familyService.createFamilyMemberForm();

  ngOnInit(): void {
    this.familyService
      .getFamilyMemberByRole(Roles.MOTHER)
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
          this.photoUrl.set(mother.photoUrl || null);
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
        this.photoUrl.set(res.url);
      });
  }
  next() {
    this.saveAndNavigate(CONSTANTS.ROUTES.ONBOARDING.MATERNAL_GRANDPARENTS);
  }

  back() {
    this.saveAndNavigate(CONSTANTS.ROUTES.ONBOARDING.OWNER);
  }

  private saveAndNavigate(route: string) {
    if (this.form.invalid) {
      this.router.navigate([route]);
      return;
    }

    const raw = this.form.value;
    const mother: FamilyMember = {
      firstName: raw.firstName ?? '',
      middleName: raw.middleName ?? '',
      lastName: raw.lastName ?? '',
      gender: raw.gender ?? '',
      dob: raw.dob!,
      dod: raw.isAlive ? undefined : raw.dod || undefined,
      isAlive: raw.isAlive ?? true,
      photoUrl: this.photoUrl() ?? '',
      role: Roles.MOTHER,
    };

    const save$ = this.hasExistingRecord
      ? this.familyService.updateMemberByRole(Roles.MOTHER, mother)
      : this.familyService.createMemberByRole(Roles.MOTHER, mother);

    save$
      .pipe(
        // After saving mother, fetch both mother & father (ensures we have IDs even after update)
        switchMap(() =>
          forkJoin([
            this.familyService.getFamilyMemberByRole(Roles.MOTHER),
            this.familyService.getFamilyMemberByRole(Roles.FATHER),
          ])
        ),
        // If both present, set partner link (idempotent; overwrites/keeps one row only)
        switchMap(([savedMother, savedFather]) => {
          if (savedMother?.id && savedFather?.id) {
            return this.familyService.setPartner(
              savedMother.id,
              savedFather.id,
              PartnerStatus.UNKNOWN
            );
          }
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.familyState.mother.set(mother);
        this.router.navigate([route]);
      });
  }

  onPhotoClear() {
    this.photoUrl.set(null);
  }
}

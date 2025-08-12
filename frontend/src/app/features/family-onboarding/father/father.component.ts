import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../shared/imports/shared-primeng-imports';
import { FamilyService } from '../../../core/services/family.service';
import { FamilyStateService } from '../../../core/services/family-state.service';
import { FamilyMember } from '../../../shared/models/family-member.model';
import { CONSTANTS } from '../../../shared/constants/constants';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';
import { Roles } from '../../../shared/enums/roles.enum';
import { switchMap, forkJoin, of } from 'rxjs';
import { PartnerStatus } from '../../../shared/enums/partner-status.enum';

@Component({
  selector: 'app-father',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './father.component.html',
  styleUrls: ['./father.component.scss'],
})
export class FatherComponent implements OnInit {
  CONSTANTS = CONSTANTS;
  Roles = Roles;
  private familyService = inject(FamilyService);
  private familyState = inject(FamilyStateService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  apiUrl = environment.apiUrl;
  photoUrl = signal<string | null>(null);
  hasExistingRecord = false;
  form = this.familyService.createFamilyMemberForm();

  ngOnInit(): void {
    this.familyService
      .getFamilyMemberByRole(Roles.FATHER)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((father) => {
        if (father) {
          this.hasExistingRecord = true;
          this.form.patchValue({
            ...father,
            dob: father.dob ? new Date(father.dob) : null,
            dod: father.dod ? new Date(father.dod) : null,
          });
          this.photoUrl.set(father.photoUrl || null);
          this.familyState.father.set(father);
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

  onPhotoClear() {
    this.photoUrl.set(null);
  }

  next() {
    this.saveAndNavigate(CONSTANTS.ROUTES.ONBOARDING.PATERNAL_GRANDPARENTS);
  }

  back() {
    this.saveAndNavigate(CONSTANTS.ROUTES.ONBOARDING.MATERNAL_GRANDPARENTS);
  }

  private saveAndNavigate(route: string) {
  if (this.form.invalid) {
    this.router.navigate([route]);
    return;
  }

  const raw = this.form.value;
  const father: FamilyMember = {
    firstName: raw.firstName ?? '',
    middleName: raw.middleName ?? '',
    lastName: raw.lastName ?? '',
    gender: raw.gender ?? '',
    dob: raw.dob!,
    dod: raw.isAlive ? undefined : raw.dod || undefined,
    isAlive: raw.isAlive ?? true,
    photoUrl: this.photoUrl() ?? '',
    role: Roles.FATHER,
  };

  const save$ = this.hasExistingRecord
    ? this.familyService.updateMemberByRole(Roles.FATHER, father)
    : this.familyService.createMemberByRole(Roles.FATHER, father);

  save$
    .pipe(
      switchMap(() =>
        forkJoin([
          this.familyService.getFamilyMemberByRole(Roles.FATHER),
          this.familyService.getFamilyMemberByRole(Roles.MOTHER),
        ])
      ),
      switchMap(([savedFather, savedMother]) => {
        if (savedFather?.id && savedMother?.id) {
          return this.familyService.setPartner(
            savedFather.id,
            savedMother.id,
            PartnerStatus.UNKNOWN
          );
        }
        return of(null);
      }),
      takeUntilDestroyed(this.destroyRef)
    )
    .subscribe(() => {
      this.familyState.father.set(father);
      this.router.navigate([route]);
    });
}
}

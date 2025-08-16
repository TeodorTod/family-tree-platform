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
import { TranslateService } from '@ngx-translate/core';

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
  private translate = inject(TranslateService);

  photoUrl = signal<string | null>(null);
  hasExistingRecord = false;
  apiUrl = environment.apiUrl;

  form = this.familyService.createFamilyMemberForm();

  // labels for the DOB mode dropdown
  dobModeOptions = [
    { label: this.translate.instant(CONSTANTS.INFO_DATE_OF_BIRTH), value: 'exact' as const },
    { label: this.translate.instant(CONSTANTS.INFO_DOB_YEAR_ONLY), value: 'year' as const },
    { label: this.translate.instant(CONSTANTS.INFO_DOB_NOTE_LABEL), value: 'note' as const },
  ];

  ngOnInit(): void {
    this.familyService
      .getFamilyMemberByRole(Roles.MOTHER)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((mother) => {
        if (!mother) {
          this.form.get('dobMode')?.setValue('exact', { emitEvent: false });
          return;
        }

        this.hasExistingRecord = true;

        // choose mode based on stored data
        const dobMode: 'exact' | 'year' | 'note' =
          mother.dob ? 'exact' :
          mother.birthYear ? 'year' :
          mother.birthNote ? 'note' : 'exact';

        // Patch ONLY the controls that exist in the form
        this.form.patchValue({
          firstName: mother.firstName ?? null,
          middleName: mother.middleName ?? null,
          lastName: mother.lastName ?? null,
          gender: mother.gender ?? null,

          dobMode,
          dob: mother.dob ? new Date(mother.dob) : null,
          birthYear: mother.birthYear ?? null,
          birthNote: mother.birthNote ?? null,

          dod: mother.dod ? new Date(mother.dod) : null,
          isAlive: (mother.isAlive ?? true) as boolean,
          translatedRole: mother.translatedRole ?? null,
        });

        this.photoUrl.set(mother.photoUrl || null);
        this.familyState.mother.set(mother);
      });
  }

  // year picker ⇒ keep only the year
  onDobYearPicked(d: Date) {
    if (!d) return;
    this.form.get('birthYear')?.setValue(d.getFullYear());
  }

  onPhotoUpload(event: any) {
    const file = event.files[0];
    this.familyService
      .uploadPhoto(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => this.photoUrl.set(res.url));
  }

  onPhotoClear() {
    this.photoUrl.set(null);
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
    const dobPayload = this.familyService.buildDobPayload(this.form); // { dob | birthYear | birthNote }

    const mother: FamilyMember = {
      firstName: raw.firstName ?? '',
      middleName: raw.middleName ?? '',
      lastName: raw.lastName ?? '',
      gender: raw.gender ?? '',

      // send Date|null to match your model; buildDobPayload returns ISO string
      dob: dobPayload.dob ? new Date(dobPayload.dob) : null,
      birthYear: dobPayload.birthYear ?? null,
      
      birthNote: dobPayload.birthNote ?? null,

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
        switchMap(() =>
          forkJoin([
            this.familyService.getFamilyMemberByRole(Roles.MOTHER),
            this.familyService.getFamilyMemberByRole(Roles.FATHER),
          ])
        ),
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
}

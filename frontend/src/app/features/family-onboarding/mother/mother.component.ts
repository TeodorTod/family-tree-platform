import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FamilyStateService } from '../../../core/services/family-state.service';
import { FamilyService } from '../../../core/services/family.service';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../shared/imports/shared-primeng-imports';
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

  // Dropdown options
  dobModeOptions = [
    { label: this.translate.instant(CONSTANTS.INFO_DATE_OF_BIRTH), value: 'exact' as const },
    { label: this.translate.instant(CONSTANTS.INFO_DOB_YEAR_ONLY), value: 'year' as const },
    { label: this.translate.instant(CONSTANTS.INFO_DOB_NOTE_LABEL), value: 'note' as const },
  ];

  dodModeOptions = [
    { label: this.translate.instant(CONSTANTS.INFO_DATE_OF_DEATH), value: 'exact' as const },
    { label: this.translate.instant(CONSTANTS.INFO_DOD_YEAR_ONLY ?? CONSTANTS.INFO_DOB_YEAR_ONLY), value: 'year' as const },
    { label: this.translate.instant(CONSTANTS.INFO_DOD_NOTE_LABEL ?? CONSTANTS.INFO_DOB_NOTE_LABEL), value: 'note' as const },
  ];

  ngOnInit(): void {
    this.familyService
      .getFamilyMemberByRole(Roles.MOTHER)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((mother) => {
        if (!mother) {
          // defaults
          this.form.patchValue(
            { dobMode: 'exact', dodMode: 'exact', isAlive: true },
            { emitEvent: false }
          );
          return;
        }

        this.hasExistingRecord = true;

        // infer modes
        const dobMode: 'exact' | 'year' | 'note' =
          mother.dob ? 'exact' : mother.birthYear ? 'year' : mother.birthNote ? 'note' : 'exact';

        const dodMode: 'exact' | 'year' | 'note' =
          mother.isAlive
            ? 'exact'
            : mother.dod ? 'exact' : mother.deathYear ? 'year' : mother.deathNote ? 'note' : 'exact';

        // set modes first (to avoid validators clearing other values)
        this.form.patchValue({ dobMode, dodMode }, { emitEvent: false });

        // patch everything else
        this.form.patchValue(
          {
            firstName: mother.firstName ?? null,
            middleName: mother.middleName ?? null,
            lastName: mother.lastName ?? null,
            gender: mother.gender ?? null,

            // birth
            dob: mother.dob ? new Date(mother.dob) : null,
            birthYear: mother.birthYear ?? null,
            birthYearDate: mother.birthYear ? new Date(mother.birthYear, 0, 1) : null,
            birthNote: mother.birthNote ?? null,

            // death
            isAlive: mother.isAlive ?? true,
            dod: mother.dod ? new Date(mother.dod) : null,
            deathYear: mother.deathYear ?? null,
            deathYearDate: mother.deathYear ? new Date(mother.deathYear, 0, 1) : null,
            deathNote: mother.deathNote ?? null,

            translatedRole: mother.translatedRole ?? null,
          },
          { emitEvent: false }
        );

        this.photoUrl.set(mother.photoUrl || null);
        this.familyState.mother.set(mother);
      });
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

    const dobPayload = this.familyService.buildDobPayload(this.form);
    const dodPayload = this.familyService.buildDodPayload(this.form);

    const raw = this.form.value;

    const payload: any = {
      firstName: raw.firstName ?? '',
      middleName: raw.middleName ?? null,
      lastName: raw.lastName ?? '',
      gender: raw.gender ?? null,
      isAlive: raw.isAlive ?? true,
      photoUrl: this.photoUrl() ?? '',
      role: Roles.MOTHER,
      ...dobPayload,
      ...dodPayload,
      translatedRole: raw.translatedRole ?? null,
    };

    const save$ = this.hasExistingRecord
      ? this.familyService.updateMemberByRole(Roles.MOTHER, payload)
      : this.familyService.createMemberByRole(Roles.MOTHER, payload);

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
        this.familyState.mother.set(payload);
        this.router.navigate([route]);
      });
  }
}

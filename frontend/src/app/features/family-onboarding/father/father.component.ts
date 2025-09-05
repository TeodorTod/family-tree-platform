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
import { TranslateService } from '@ngx-translate/core';
import { BirthDeathDateMode } from '../../../shared/enums/birth-death-date.enum';

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
  private translate = inject(TranslateService);

  apiUrl = environment.apiUrl;
  photoUrl = signal<string | null>(null);
  hasExistingRecord = false;

  form = this.familyService.createFamilyMemberForm();

  // Modes
  dobModeOptions = [
    {
      label: this.translate.instant(CONSTANTS.INFO_DATE_OF_BIRTH),
      value: BirthDeathDateMode.EXACT,
    },
    {
      label: this.translate.instant(CONSTANTS.INFO_DOB_YEAR_ONLY),
      value: BirthDeathDateMode.YEAR,
    },
    {
      label: this.translate.instant(CONSTANTS.INFO_DOB_NOTE_LABEL),
      value: BirthDeathDateMode.NOTE,
    },
  ];

  dodModeOptions = [
    {
      label: this.translate.instant(CONSTANTS.INFO_DATE_OF_DEATH),
      value: BirthDeathDateMode.EXACT,
    },
    {
      label: this.translate.instant(
        CONSTANTS.INFO_DOD_YEAR_ONLY ?? CONSTANTS.INFO_DOB_YEAR_ONLY
      ),
      value: BirthDeathDateMode.YEAR,
    },
    {
      label: this.translate.instant(
        CONSTANTS.INFO_DOD_NOTE_LABEL ?? CONSTANTS.INFO_DOB_NOTE_LABEL
      ),
      value: BirthDeathDateMode.NOTE,
    },
  ];

  ngOnInit(): void {
    this.familyService
      .getFamilyMemberByRole(Roles.FATHER)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((father) => {
        if (!father) {
          this.form.patchValue(
            {
              dobMode: BirthDeathDateMode.EXACT,
              dodMode: BirthDeathDateMode.EXACT,
              isAlive: true,
            },
            { emitEvent: false }
          );
          return;
        }

        this.hasExistingRecord = true;

        const dobMode: BirthDeathDateMode = father.dob
          ? BirthDeathDateMode.EXACT
          : father.birthYear
          ? BirthDeathDateMode.YEAR
          : father.birthNote
          ? BirthDeathDateMode.NOTE
          : BirthDeathDateMode.EXACT;

        const dodMode: BirthDeathDateMode = father.isAlive
          ? BirthDeathDateMode.EXACT
          : father.dod
          ? BirthDeathDateMode.EXACT
          : father.deathYear
          ? BirthDeathDateMode.YEAR
          : father.deathNote
          ? BirthDeathDateMode.NOTE
          : BirthDeathDateMode.EXACT;

        this.form.patchValue({ dobMode, dodMode }, { emitEvent: false });

        // patch values
        this.form.patchValue(
          {
            firstName: father.firstName ?? null,
            middleName: father.middleName ?? null,
            lastName: father.lastName ?? null,
            gender: father.gender ?? null,

            // birth
            dob: father.dob ? new Date(father.dob) : null,
            birthYear: father.birthYear ?? null,
            birthNote: father.birthNote ?? null,

            // death
            isAlive: father.isAlive ?? true,
            dod: father.dod ? new Date(father.dod) : null,
            deathYear: (father as any).deathYear ?? null,
            deathNote: (father as any).deathNote ?? null,

            translatedRole: father.translatedRole ?? null,
          },
          { emitEvent: false }
        );

        this.photoUrl.set(father.photoUrl || null);
        this.familyState.father.set(father);
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
      role: Roles.FATHER,
      translatedRole: raw.translatedRole ?? null,
      ...dobPayload,
      ...dodPayload,
    };

    const save$ = this.hasExistingRecord
      ? this.familyService.updateMemberByRole(Roles.FATHER, payload)
      : this.familyService.createMemberByRole(Roles.FATHER, payload);

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
        this.familyState.father.set(payload);
        this.router.navigate([route]);
      });
  }
}

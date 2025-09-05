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
import { forkJoin, of, switchMap } from 'rxjs';
import { PartnerStatus } from '../../../shared/enums/partner-status.enum';
import { TranslateService } from '@ngx-translate/core';
import { BirthDeathDateMode } from '../../../shared/enums/birth-death-date.enum';

@Component({
  selector: 'app-maternal-grandparents',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './maternal-grandparents.component.html',
  styleUrls: ['./maternal-grandparents.component.scss'],
})
export class MaternalGrandparentsComponent implements OnInit {
  CONSTANTS = CONSTANTS;
  Roles = Roles;

  private familyService = inject(FamilyService);
  private familyState = inject(FamilyStateService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private translate = inject(TranslateService);

  apiUrl = environment.apiUrl;

  grandmotherPhotoUrl = signal<string | null>(null);
  grandfatherPhotoUrl = signal<string | null>(null);

  grandmotherForm = this.familyService.createFamilyMemberForm();
  grandfatherForm = this.familyService.createFamilyMemberForm();

  grandmotherExists = false;
  grandfatherExists = false;

  // Mode dropdowns (reused by both forms)
  dobModeOptions: Array<{ label: string; value: BirthDeathDateMode }> = [
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

  dodModeOptions: Array<{ label: string; value: BirthDeathDateMode }> = [
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
    this.loadMember(
      Roles.MATERNAL_GRANDMOTHER,
      this.grandmotherForm,
      this.grandmotherPhotoUrl,
      'grandmotherExists'
    );
    this.loadMember(
      Roles.MATERNAL_GRANDFATHER,
      this.grandfatherForm,
      this.grandfatherPhotoUrl,
      'grandfatherExists'
    );
  }

  private loadMember(
    role: Roles,
    form: ReturnType<FamilyService['createFamilyMemberForm']>,
    photoSignal: ReturnType<typeof signal<string | null>>,
    existenceFlag: 'grandmotherExists' | 'grandfatherExists'
  ) {
    this.familyService
      .getFamilyMemberByRole(role)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((member) => {
        if (!member) {
          form.patchValue(
            {
              dobMode: BirthDeathDateMode.EXACT,
              dodMode: BirthDeathDateMode.EXACT,
              isAlive: true,
            },
            { emitEvent: false }
          );
          return;
        }

        this[existenceFlag] = true;

        // infer modes with enum
        const dobMode: BirthDeathDateMode = member.dob
          ? BirthDeathDateMode.EXACT
          : member.birthYear
          ? BirthDeathDateMode.YEAR
          : member.birthNote
          ? BirthDeathDateMode.NOTE
          : BirthDeathDateMode.EXACT;

        const deathYear = (member as any).deathYear ?? null;
        const deathNote = (member as any).deathNote ?? null;

        const dodMode: BirthDeathDateMode = member.isAlive
          ? BirthDeathDateMode.EXACT
          : member.dod
          ? BirthDeathDateMode.EXACT
          : deathYear
          ? BirthDeathDateMode.YEAR
          : deathNote
          ? BirthDeathDateMode.NOTE
          : BirthDeathDateMode.EXACT;

        // set modes first
        form.patchValue({ dobMode, dodMode }, { emitEvent: false });

        // patch rest
        form.patchValue(
          {
            firstName: member.firstName ?? null,
            middleName: member.middleName ?? null,
            lastName: member.lastName ?? null,
            gender: member.gender ?? null,

            // birth
            dob: member.dob ? new Date(member.dob) : null,
            birthYear: member.birthYear ?? null,
            birthYearDate: member.birthYear
              ? new Date(member.birthYear, 0, 1)
              : null,
            birthNote: member.birthNote ?? null,

            // death
            isAlive: member.isAlive ?? true,
            dod: member.dod ? new Date(member.dod) : null,
            deathYear,
            deathYearDate: deathYear ? new Date(deathYear, 0, 1) : null,
            deathNote,

            translatedRole: member.translatedRole ?? null,
          },
          { emitEvent: false }
        );

        // state + photo
        this.familyState[
          role === Roles.MATERNAL_GRANDMOTHER
            ? 'maternalGrandmother'
            : 'maternalGrandfather'
        ].set(member);

        photoSignal.set(member.photoUrl || null);
      });
  }

  uploadPhoto(event: any, role: Roles) {
    const file = event.files[0];
    this.familyService
      .uploadPhoto(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        role === Roles.MATERNAL_GRANDMOTHER
          ? this.grandmotherPhotoUrl.set(res.url)
          : this.grandfatherPhotoUrl.set(res.url);
      });
  }

  clearPhoto(role: Roles) {
    role === Roles.MATERNAL_GRANDMOTHER
      ? this.grandmotherPhotoUrl.set(null)
      : this.grandfatherPhotoUrl.set(null);
  }

  back() {
    this.saveAndNavigate(CONSTANTS.ROUTES.ONBOARDING.MOTHER);
  }

  save() {
    this.saveAndNavigate(CONSTANTS.ROUTES.ONBOARDING.FATHER);
  }

  private saveAndNavigate(route: string) {
    const members = [
      {
        role: Roles.MATERNAL_GRANDMOTHER,
        form: this.grandmotherForm,
        photoUrl: this.grandmotherPhotoUrl(),
        exists: this.grandmotherExists,
      },
      {
        role: Roles.MATERNAL_GRANDFATHER,
        form: this.grandfatherForm,
        photoUrl: this.grandfatherPhotoUrl(),
        exists: this.grandfatherExists,
      },
    ];

    const saveRequests = members
      .filter(({ form }) => form.valid)
      .map(({ role, form, photoUrl, exists }) => {
        const raw = form.value;
        const dobPayload = this.familyService.buildDobPayload(form);
        const dodPayload = this.familyService.buildDodPayload(form);

        const payload: any = {
          firstName: raw.firstName ?? '',
          middleName: raw.middleName ?? null,
          lastName: raw.lastName ?? '',
          gender: raw.gender ?? null,
          isAlive: raw.isAlive ?? true,
          photoUrl: photoUrl ?? '',
          role,
          translatedRole: raw.translatedRole ?? null,
          ...dobPayload,
          ...dodPayload,
        };

        return (
          exists
            ? this.familyService.updateMemberByRole(role, payload)
            : this.familyService.createMemberByRole(role, payload)
        ).pipe(takeUntilDestroyed(this.destroyRef));
      });

    if (saveRequests.length === 0) {
      this.router.navigate([route]);
      return;
    }

    forkJoin(saveRequests)
      .pipe(
        // fetch both after save to ensure we have IDs
        switchMap(() =>
          forkJoin([
            this.familyService.getFamilyMemberByRole(
              Roles.MATERNAL_GRANDMOTHER
            ),
            this.familyService.getFamilyMemberByRole(
              Roles.MATERNAL_GRANDFATHER
            ),
          ])
        ),
        // link them if both exist
        switchMap(([gm, gf]) => {
          if (gm?.id && gf?.id) {
            return this.familyService.setPartner(
              gm.id,
              gf.id,
              PartnerStatus.UNKNOWN
            );
          }
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.router.navigate([route]));
  }
}

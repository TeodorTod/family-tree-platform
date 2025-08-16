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

@Component({
  selector: 'app-paternal-grandparents',
  standalone: true,
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './paternal-grandparents.component.html',
  styleUrls: ['./paternal-grandparents.component.scss'],
})
export class PaternalGrandparentsComponent implements OnInit {
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

  dobModeOptions = [
    {
      label: this.translate.instant(CONSTANTS.INFO_DATE_OF_BIRTH),
      value: 'exact',
    },
    {
      label: this.translate.instant(CONSTANTS.INFO_DOB_YEAR_ONLY),
      value: 'year',
    },
    {
      label: this.translate.instant(CONSTANTS.INFO_DOB_NOTE_LABEL),
      value: 'note',
    },
  ];

  ngOnInit(): void {
    this.loadMember(
      Roles.PATERNAL_GRANDMOTHER,
      this.grandmotherForm,
      this.grandmotherPhotoUrl,
      'grandmotherExists'
    );
    this.loadMember(
      Roles.PATERNAL_GRANDFATHER,
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
          // default mode
          form.get('dobMode')?.setValue('exact', { emitEvent: false });
          return;
        }

        this[existenceFlag] = true;

        const dobMode: 'exact' | 'year' | 'note' = member.dob
          ? 'exact'
          : member.birthYear
          ? 'year'
          : member.birthNote
          ? 'note'
          : 'exact';

        // Patch ONLY known form controls (avoid spreading member)
        form.patchValue({
          firstName: member.firstName ?? null,
          middleName: member.middleName ?? null,
          lastName: member.lastName ?? null,
          gender: member.gender ?? null,

          dobMode,
          dob: member.dob ? new Date(member.dob) : null,
          birthYear: member.birthYear ?? null,
          birthNote: member.birthNote ?? null,

          dod: member.dod ? new Date(member.dod) : null,
          isAlive: (member.isAlive ?? true) as boolean,
          translatedRole: member.translatedRole ?? null,
        });

        // save to state and UI photo
        this.familyState[
          role === Roles.PATERNAL_GRANDMOTHER
            ? 'paternalGrandmother'
            : 'paternalGrandfather'
        ].set(member);
        photoSignal.set(member.photoUrl || null);
      });
  }

  // When user picks a year from the year-view calendar, store just the year
  onDobYearPicked(
    form: ReturnType<FamilyService['createFamilyMemberForm']>,
    d: Date
  ) {
    if (!d) return;
    form.get('birthYear')?.setValue(d.getFullYear());
  }

  uploadPhoto(event: any, role: Roles) {
    const file = event.files[0];
    this.familyService
      .uploadPhoto(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        role === Roles.PATERNAL_GRANDMOTHER
          ? this.grandmotherPhotoUrl.set(res.url)
          : this.grandfatherPhotoUrl.set(res.url);
      });
  }

  clearPhoto(role: Roles) {
    role === Roles.PATERNAL_GRANDMOTHER
      ? this.grandmotherPhotoUrl.set(null)
      : this.grandfatherPhotoUrl.set(null);
  }

  back() {
    this.saveAndNavigate(CONSTANTS.ROUTES.ONBOARDING.FATHER);
  }

  save() {
    this.saveAndNavigate(CONSTANTS.ROUTES.HOME);
  }

  private saveAndNavigate(route: string) {
    const members = [
      {
        role: Roles.PATERNAL_GRANDMOTHER,
        form: this.grandmotherForm,
        photoUrl: this.grandmotherPhotoUrl(),
        exists: this.grandmotherExists,
      },
      {
        role: Roles.PATERNAL_GRANDFATHER,
        form: this.grandfatherForm,
        photoUrl: this.grandfatherPhotoUrl(),
        exists: this.grandfatherExists,
      },
    ];

    const saveRequests = members
      .filter(({ form }) => form.valid)
      .map(({ role, form, photoUrl, exists }) => {
        const raw = form.value;
        const dobPayload = this.familyService.buildDobPayload(form); // { dob | birthYear | birthNote }

        const data: FamilyMember = {
          firstName: raw.firstName ?? '',
          middleName: raw.middleName ?? '',
          lastName: raw.lastName ?? '',
          gender: raw.gender ?? '',

          // NEW: send one of the 3 DOB variants (optional)
          dob: dobPayload.dob ? new Date(dobPayload.dob) : null,
          birthYear: dobPayload.birthYear ?? null,
          birthNote: dobPayload.birthNote ?? null,

          dod: raw.isAlive ? undefined : raw.dod || undefined,
          isAlive: raw.isAlive ?? true,
          photoUrl: photoUrl ?? '',
          role: role,
        };

        return (
          exists
            ? this.familyService.updateMemberByRole(role, data)
            : this.familyService.createMemberByRole(role, data)
        ).pipe(takeUntilDestroyed(this.destroyRef));
      });

    if (saveRequests.length === 0) {
      this.router.navigate([route]);
      return;
    }

    forkJoin(saveRequests)
      .pipe(
        switchMap(() =>
          forkJoin([
            this.familyService.getFamilyMemberByRole(
              Roles.PATERNAL_GRANDMOTHER
            ),
            this.familyService.getFamilyMemberByRole(
              Roles.PATERNAL_GRANDFATHER
            ),
          ])
        ),
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
      .subscribe(() => {
        this.router.navigate([route]);
      });
  }
}

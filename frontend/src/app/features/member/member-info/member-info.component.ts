import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormGroup } from '@angular/forms';
import { FamilyService } from '../../../core/services/family.service';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../shared/imports/shared-primeng-imports';
import { CONSTANTS } from '../../../shared/constants/constants';
import { TranslateService } from '@ngx-translate/core';
import { MemberAchievementsComponent } from '../components/member-achievements/member-achievements.component';
import { MemberBioComponent } from '../components/member-bio/member-bio.component';
import { MemberCareerComponent } from '../components/member-career/member-career.component';
import { MemberFavoritesComponent } from '../components/member-favorites/member-favorites.component';
import { MemberPersonalInfoComponent } from '../components/member-personal-info/member-personal-info.component';
import { MemberRelationsComponent } from '../components/member-relations/member-relations.component';
import { MemberMediaGalleryComponent } from '../components/member-media-gallery/member-media-gallery.component';

@Component({
  selector: 'app-member-info',
  standalone: true,
  imports: [
    ...SHARED_ANGULAR_IMPORTS,
    ...SHARED_PRIMENG_IMPORTS,
    MemberBioComponent,
    MemberCareerComponent,
    MemberAchievementsComponent,
    MemberFavoritesComponent,
    MemberPersonalInfoComponent,
    MemberRelationsComponent,
    MemberMediaGalleryComponent,
  ],
  templateUrl: './member-info.component.html',
  styleUrls: ['./member-info.component.scss'],
})
export class MemberInfoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private familyService = inject(FamilyService);
  public translate = inject(TranslateService);

  form!: FormGroup;
  role!: string;
  CONSTANTS = CONSTANTS;

  // DOB mode options
  dobModeOptions = [
    {
      label: this.translate.instant(CONSTANTS.INFO_DATE_OF_BIRTH),
      value: 'exact' as const,
    },
    {
      label: this.translate.instant(CONSTANTS.INFO_DOB_YEAR_ONLY),
      value: 'year' as const,
    },
    {
      label: this.translate.instant(CONSTANTS.INFO_DOB_NOTE_LABEL),
      value: 'note' as const,
    },
  ];

  // DOD mode options
  dodModeOptions = [
    {
      label: this.translate.instant(CONSTANTS.INFO_DATE_OF_DEATH),
      value: 'exact' as const,
    },
    {
      label: this.translate.instant(
        CONSTANTS.INFO_DOD_YEAR_ONLY ?? CONSTANTS.INFO_DOB_YEAR_ONLY
      ),
      value: 'year' as const,
    },
    {
      label: this.translate.instant(
        CONSTANTS.INFO_DOD_NOTE_LABEL ?? CONSTANTS.INFO_DOB_NOTE_LABEL
      ),
      value: 'note' as const,
    },
  ];

  ngOnInit() {
    this.role = this.route.snapshot.paramMap.get('role')!;
    this.form = this.familyService.createFamilyMemberForm(); // has dobMode/dodMode etc.

    this.familyService.getFamilyMemberByRole(this.role).subscribe((member) => {
      if (!member) {
        this.form.patchValue(
          { dobMode: 'exact', dodMode: 'exact', isAlive: true },
          { emitEvent: false }
        );
        if (!this.hasConstant(this.role)) {
          this.form.patchValue(
            { translatedRole: this.defaultGenericForRole() },
            { emitEvent: false }
          );
        }
        return;
      }

      const converted = this.convertDatesToObjects(member);

      let dobMode: 'exact' | 'year' | 'note' = 'exact';
      if (!converted.dob && converted.birthYear) {
        converted.dob = new Date(converted.birthYear, 0, 1);
        dobMode = 'year';
      } else if (converted.birthNote) {
        dobMode = 'note';
      }

      // infer DOD mode
      let dodMode: 'exact' | 'year' | 'note' = 'exact';
      if (converted.isAlive === false) {
        if (converted.dod) dodMode = 'exact';
        else if ((converted as any).deathYear) dodMode = 'year';
        else if ((converted as any).deathNote) dodMode = 'note';
      }

      this.form.patchValue({ dobMode, dodMode }, { emitEvent: false });

      this.form.patchValue(
        {
          // basic
          firstName: converted.firstName ?? null,
          middleName: converted.middleName ?? null,
          lastName: converted.lastName ?? null,
          gender: converted.gender ?? null,
          translatedRole:
            member.translatedRole ??
            (this.hasConstant(this.role) ? null : this.defaultGenericForRole()),

          // birth
          dob: converted.dob ?? null,
          birthYear: converted.birthYear ?? null,
          birthNote: converted.birthNote ?? null,

          // death
          isAlive: converted.isAlive ?? true,
          dod: converted.dod ?? null,
          deathYear: (converted as any).deathYear ?? null,
          deathYearDate: (converted as any).deathYear
            ? new Date((converted as any).deathYear, 0, 1)
            : null,
          deathNote: (converted as any).deathNote ?? null,
        },
        { emitEvent: false }
      );
    });
  }

  save() {
    if (this.form.invalid) return;

    const dobPayload = this.familyService.buildDobPayload(this.form);
    const dodPayload = this.familyService.buildDodPayload(this.form);

    const v = this.form.value;

    const data: any = {
      role: this.role,
      firstName: v.firstName ?? '',
      middleName: v.middleName ?? null,
      lastName: v.lastName ?? '',
      gender: v.gender ?? null,
      isAlive: v.isAlive ?? true,
      translatedRole: v.translatedRole ?? null,
      ...dobPayload,
      ...dodPayload,
    };

    this.familyService.saveMemberByRole(this.role, data).subscribe({
      next: (saved) => {
        this.form.markAsPristine();
        this.form.markAsUntouched();
      },
    });
  }

  cancel(): void {
    const previousView = this.route.snapshot.queryParamMap.get('view');
    this.router.navigate(['/'], {
      queryParams: { view: previousView || 'chart' },
    });
  }

  private inferLineage(role: string): 'maternal' | 'paternal' | 'unknown' {
    const parts = role.toLowerCase().split('_');
    if (parts[0] === 'paternal') return 'paternal';
    if (parts[0] === 'maternal') return 'maternal';
    const iFather = parts.indexOf('father');
    const iMother = parts.indexOf('mother');
    if (iFather === -1 && iMother === -1) return 'unknown';
    if (iFather !== -1 && iMother === -1) return 'paternal';
    if (iMother !== -1 && iFather === -1) return 'maternal';
    return iFather < iMother ? 'paternal' : 'maternal';
  }

  private defaultGenericForRole(): string {
    const side = this.inferLineage(this.role);
    if (side === 'maternal')
      return this.translate.instant(CONSTANTS.RELATION_MATERNAL_GENERIC);
    if (side === 'paternal')
      return this.translate.instant(CONSTANTS.RELATION_PATERNAL_GENERIC);
    return this.translate.instant(CONSTANTS.RELATION_UNKNOWN);
  }

  getTranslatedRoleLabel(): string {
    if (!this.hasConstant(this.role)) {
      const v = this.form?.get('translatedRole')?.value;
      return v || this.defaultGenericForRole();
    }
    const parts = this.role.split('_');
    for (let len = parts.length; len > 0; len--) {
      const key = 'RELATION_' + parts.slice(0, len).join('_').toUpperCase();
      const constantKey = (CONSTANTS as any)[key] as string | undefined;
      if (constantKey) return this.translate.instant(constantKey);
    }
    return this.defaultGenericForRole();
  }

  private convertDatesToObjects(obj: any): any {
    const clone = { ...obj };
    for (const key of Object.keys(clone)) {
      const value = clone[key];
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
        clone[key] = new Date(value);
      } else if (typeof value === 'object' && value !== null) {
        clone[key] = this.convertDatesToObjects(value);
      }
    }
    return clone;
  }

  hasConstant(role: string): boolean {
    const key = 'RELATION_' + role.toUpperCase();
    return !!(CONSTANTS as any)[key];
  }
}

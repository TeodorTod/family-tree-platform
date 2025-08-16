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

  // add options for DOB mode
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

  ngOnInit() {
    this.role = this.route.snapshot.paramMap.get('role')!;
    this.form = this.familyService.createFamilyMemberForm(); // includes dobMode, dob, birthYear, birthNote

    this.familyService.getFamilyMemberByRole(this.role).subscribe((member) => {
      if (!member) {
        if (!this.hasConstant(this.role)) {
          this.form.patchValue({
            translatedRole: this.defaultGenericForRole(),
          });
        }
        return;
      }

      const converted = this.convertDatesToObjects(member);

      // decide DOB mode and hydrate dob for year-mode so the year picker shows it
      let dobMode: 'exact' | 'year' | 'note' = 'exact';
      if (!converted.dob && converted.birthYear) {
        converted.dob = new Date(converted.birthYear, 0, 1);
        dobMode = 'year';
      } else if (converted.birthNote) {
        dobMode = 'note';
      }

      this.form.patchValue({
        ...converted,
        dobMode,
        translatedRole:
          member.translatedRole ??
          (this.hasConstant(this.role) ? null : this.defaultGenericForRole()),
      });
    });
  }

  save() {
    if (this.form.invalid) return;

    const v = this.form.value;

    // Inline DOB payload (no helper):
    let dob: string | null = null;
    let birthYear: number | null = null;
    let birthNote: string | null = null;

    if (v.dobMode === 'exact' && v.dob) {
      dob = new Date(v.dob).toISOString();
    } else if (v.dobMode === 'year' && v.dob) {
      birthYear = new Date(v.dob).getFullYear();
    } else if (v.dobMode === 'note' && v.birthNote) {
      birthNote = v.birthNote;
    }

    const data: any = {
      role: this.role,
      firstName: v.firstName ?? '',
      middleName: v.middleName ?? null,
      lastName: v.lastName ?? '',
      gender: v.gender ?? null,
      isAlive: v.isAlive ?? true,
      translatedRole: v.translatedRole ?? null,

      // DOB payload
      dob,
      birthYear,
      birthNote,

      // DOD only if not alive
      dod: v.isAlive ? null : v.dod ? new Date(v.dod).toISOString() : null,
    };

    this.familyService
      .saveMemberByRole(this.role, data)
      .subscribe(() => this.cancel());
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

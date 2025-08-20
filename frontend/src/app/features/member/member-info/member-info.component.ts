import {
  Component,
  OnInit,
  ViewChild,
  inject,
  signal,
  DestroyRef,
} from '@angular/core';
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

import { MemberProfileService } from '../../../core/services/member-profile.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MemberProfile } from '../../../shared/models/member-profile.model';
import { ConfirmationService, MessageService } from 'primeng/api';

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
  private profileService = inject(MemberProfileService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);
  private confirm = inject(ConfirmationService);
  private messageService = inject(MessageService);

  form!: FormGroup;
  role!: string;
  CONSTANTS = CONSTANTS;
  activeIndex = signal(0);
  profileDraft: MemberProfile = {};
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

  // ViewChild hooks (optional): if your child tabs expose getters, you can read them here
  @ViewChild(MemberBioComponent) bioTab?: MemberBioComponent;
  @ViewChild(MemberCareerComponent) careerTab?: MemberCareerComponent;
  @ViewChild(MemberAchievementsComponent)
  achievementsTab?: MemberAchievementsComponent;
  @ViewChild(MemberFavoritesComponent) favoritesTab?: MemberFavoritesComponent;
  @ViewChild(MemberPersonalInfoComponent)
  personalInfoTab?: MemberPersonalInfoComponent;

  ngOnInit() {
    this.role = this.route.snapshot.paramMap.get('role')!;
    this.form = this.familyService.createFamilyMemberForm();

    // Load FamilyMember (tab 0)
    this.familyService
      .getFamilyMemberByRole(this.role)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((member) => {
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

        let dodMode: 'exact' | 'year' | 'note' = 'exact';
        if (converted.isAlive === false) {
          if (converted.dod) dodMode = 'exact';
          else if ((converted as any).deathYear) dodMode = 'year';
          else if ((converted as any).deathNote) dodMode = 'note';
        }

        this.form.patchValue({ dobMode, dodMode }, { emitEvent: false });

        this.form.patchValue(
          {
            firstName: converted.firstName ?? null,
            middleName: converted.middleName ?? null,
            lastName: converted.lastName ?? null,
            gender: converted.gender ?? null,
            translatedRole:
              member.translatedRole ??
              (this.hasConstant(this.role)
                ? null
                : this.defaultGenericForRole()),

            dob: converted.dob ?? null,
            birthYear: converted.birthYear ?? null,
            birthNote: converted.birthNote ?? null,

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

    // Load MemberProfile (for all other tabs)
    this.profileService
      .getProfileByRole(this.role)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((profile) => {
        if (profile) {
          this.profileDraft = { ...profile };
          // Optionally pass data down to tabs via @Input() bindings in template
        } else {
          this.profileDraft = {};
        }
      });
  }

  onTabIndexChange(index: number) {
    this.activeIndex.set(index);
  }

  save() {
    const current = this.activeIndex();
    if (current === 0) {
      // Save FamilyMember
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

      this.familyService
        .saveMemberByRole(this.role, data)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.form.markAsPristine();
          this.form.markAsUntouched();
        });
      return;
    }

    // Save MemberProfile for any other tab
    const profilePayload = this.buildProfilePayload();
    this.profileService
      .saveProfileByRole(this.role, profilePayload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => {
        this.profileDraft = { ...saved };
      });
  }

  // Collect values from child tabs (adjust to your child APIs)
  private buildProfilePayload(): MemberProfile {
    const draft: MemberProfile = { ...this.profileDraft };

    // If your child components expose getters like getValue(), use them; otherwise
    // keep using the draft (which you can update via @Output() from each child).
    if (this.bioTab && (this.bioTab as any).getValue) {
      draft.bio = (this.bioTab as any).getValue();
    }
    if (this.careerTab && (this.careerTab as any).getValue) {
      const career = (this.careerTab as any).getValue(); // e.g. { work: [...], education: [...] }
      draft.work = career?.work ?? draft.work ?? null;
      draft.education = career?.education ?? draft.education ?? null;
    }
    if (this.achievementsTab && (this.achievementsTab as any).getValue) {
      draft.achievements = (this.achievementsTab as any).getValue();
    }
    if (this.favoritesTab && (this.favoritesTab as any).getValue) {
      draft.favorites = (this.favoritesTab as any).getValue();
    }
    if (this.personalInfoTab && (this.personalInfoTab as any).getValue) {
      draft.personalInfo = (this.personalInfoTab as any).getValue();
    }

    return draft;
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

  confirmDelete() {
    if (this.role === 'owner') return;

    this.confirm.confirm({
      header: this.translate.instant(CONSTANTS.INFO_CONFIRM_DELETE_TITLE),
      message: this.translate.instant(CONSTANTS.INFO_CONFIRM_DELETE_MESSAGE),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant(CONSTANTS.INFO_DELETE),
      rejectLabel: this.translate.instant(CONSTANTS.INFO_CANCEL),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',

      defaultFocus: 'reject',
      accept: () => this.deleteMember(),
    });
  }

  private deleteMember() {
    this.familyService
      .deleteMemberByRole(this.role)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant(CONSTANTS.INFO_SUCCESS),
            detail: this.translate.instant(
              CONSTANTS.INFO_DELETE_MEMBER_MESSAGE
            ),
          });
          this.router.navigate(['/'], { queryParams: { view: 'chart' } });
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to delete',
          });
          console.error(err);
        },
      });
  }
}

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
    MemberMediaGalleryComponent
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

  ngOnInit(): void {
    this.role = this.route.snapshot.paramMap.get('role')!;
    this.form = this.familyService.createFamilyMemberForm();

    this.familyService.getFamilyMemberByRole(this.role).subscribe((member) => {
      if (member) {
        const converted = this.convertDatesToObjects(member);

        if (converted.dod) {
          converted.isAlive = false;
        } else {
          converted.isAlive = true;
        }

        this.form.patchValue(converted);
      }
    });
  }

  save(): void {
    const data = { ...this.form.value, role: this.role };

    this.familyService.saveMemberByRole(this.role, data).subscribe(() => {
      this.router.navigate(['/']);
    });
  }

  cancel(): void {
    this.router.navigate(['/']);
  }

  getTranslatedRoleLabel(): string {
    const key = 'RELATION_' + this.role.toUpperCase();
    const constantKey = key as keyof typeof CONSTANTS;
    const tKey = CONSTANTS[constantKey] as string;
    return this.translate.instant(tKey);
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
}

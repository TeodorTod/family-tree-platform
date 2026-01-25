import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FamilyMember } from '../../../../shared/models/family-member.model';
import { SHARED_ANGULAR_IMPORTS } from '../../../../shared/imports/shared-angular-imports';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { CONSTANTS } from '../../../../shared/constants/constants';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-tree-table',
  templateUrl: './tree-table.component.html',
  styleUrl: './tree-table.component.scss',
  imports: [
    ...SHARED_ANGULAR_IMPORTS,
    TableModule,
    ButtonModule,
    TooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreeTableComponent {
  CONSTANTS = CONSTANTS;
  private translate = inject(TranslateService);

  members = input<FamilyMember[], FamilyMember[] | null>([], {
    transform: (value: FamilyMember[] | null | undefined) => value ?? [],
  });

  totalRecords = 0;
  rowsPerPageOptions = [5, 10, 20, 50];

  addRelative = output<FamilyMember>();
  editMember = output<FamilyMember>();

  getRoleDisplay(m: FamilyMember): string {
    if (m.translatedRole && m.translatedRole.trim()) {
      return m.translatedRole.trim();
    }
    return this.translateRole(m.role);
  }

  private translateRole(role: string): string {
    const parts = (role || '').split('_');
    for (let len = parts.length; len > 0; len--) {
      const key = 'RELATION_' + parts.slice(0, len).join('_').toUpperCase();
      const constantKey = (CONSTANTS as any)[key] as string | undefined;
      if (constantKey) {
        return this.translate.instant(constantKey);
      }
    }

    // generic side fallback
    if (this.isMaternalRole(role)) {
      return this.translate.instant(CONSTANTS.RELATION_MATERNAL_GENERIC);
    }
    if (this.isPaternalRole(role)) {
      return this.translate.instant(CONSTANTS.RELATION_PATERNAL_GENERIC);
    }

    return this.translate.instant(CONSTANTS.RELATION_UNKNOWN);
  }

  private isMaternalRole(role: string): boolean {
    const parts = (role || '').split('_');
    return role.startsWith('maternal_') || parts.includes('mother');
  }

  private isPaternalRole(role: string): boolean {
    const parts = (role || '').split('_');
    return role.startsWith('paternal_') || parts.includes('father');
  }

  private formatISODate(input?: string | Date | null): string {
    if (!input) return '';
    const d = typeof input === 'string' ? new Date(input) : input;
    if (Number.isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  birthMode(m: FamilyMember): 'exact' | 'year' | 'note' | 'unknown' {
    if (m.dob) return 'exact';
    if (m.birthYear) return 'year';
    if (m.birthNote) return 'note';
    return 'unknown';
  }

  birthDisplay(m: FamilyMember): string {
    switch (this.birthMode(m)) {
      case 'exact':
        return this.formatISODate(m.dob);
      case 'year':
        return String(m.birthYear);
      case 'note':
        return m.birthNote?.trim() || '—';
      default:
        return '—';
    }
  }

  birthTooltip(m: FamilyMember): string {
    switch (this.birthMode(m)) {
      case 'exact':
        return (
          this.translate.instant(this.CONSTANTS.INFO_DATE_OF_BIRTH) +
          ': ' +
          this.formatISODate(m.dob)
        );
      case 'year':
        return (
          this.translate.instant(this.CONSTANTS.INFO_DOB_YEAR_ONLY) +
          ': ' +
          String(m.birthYear)
        );
      case 'note':
        return (
          this.translate.instant(this.CONSTANTS.INFO_DOB_NOTE_LABEL) +
          ': ' +
          (m.birthNote?.trim() || '')
        );
      default:
        return (
          this.translate.instant(this.CONSTANTS.INFO_DATE_OF_BIRTH) + ': —'
        );
    }
  }
}

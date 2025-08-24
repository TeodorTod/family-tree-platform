import { Component, EventEmitter, Output, Input, inject } from '@angular/core';
import { FamilyService } from '../../../../core/services/family.service';
import { FamilyMember } from '../../../../shared/models/family-member.model';
import { TableLazyLoadEvent } from 'primeng/table';
import { SHARED_ANGULAR_IMPORTS } from '../../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../../shared/imports/shared-primeng-imports';
import { CONSTANTS } from '../../../../shared/constants/constants';
import { MessageService } from 'primeng/api';
import { debounceTime } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-tree-table',
  templateUrl: './tree-table.component.html',
  styleUrl: './tree-table.component.scss',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  providers: [MessageService],
})
export class TreeTableComponent {
  CONSTANTS = CONSTANTS;
  private familyService = inject(FamilyService);
  private messageService = inject(MessageService);
  private translate = inject(TranslateService);

  @Input() members: FamilyMember[] = [];
  totalRecords: number = 0;
  loading = false;
  private inflight = false;

  rows: number = 10;
  first: number = 0;
  sortField: string = 'dob';
  sortOrder: number = 1;

  @Output() addRelative = new EventEmitter<FamilyMember>();
  @Output() editMember = new EventEmitter<FamilyMember>();

  constructor() {
    this.loadMembers({
      first: this.first,
      rows: this.rows,
      sortField: this.sortField,
      sortOrder: this.sortOrder,
    } as TableLazyLoadEvent);
  }

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

  loadMembers(event: TableLazyLoadEvent) {
    if (this.inflight) return;
    this.inflight = true;
    this.loading = true;

    const rows = event.rows ?? this.rows;
    const first = event.first ?? 0;
    const page = Math.floor(first / rows) || 0;
    const size = rows || 10;
    const sortField = Array.isArray(event.sortField)
      ? event.sortField[0]
      : event.sortField ?? 'dob';
    const sortOrder = event.sortOrder === 1 ? 'asc' : 'desc';

    this.rows = size;
    this.first = first;
    this.sortField = sortField;
    this.sortOrder = event.sortOrder ?? 1;

    // Slim payload for table: no edges, just columns you show
    const fields: (keyof FamilyMember)[] = [
      'id',
      'role',
      'firstName',
      'lastName',
      'gender',
      'dob',
      'birthYear',
      'birthNote',
      'translatedRole',
    ];

    this.familyService
      .getMyFamilyPaged(page, size, sortField, sortOrder, { fields })
      .subscribe({
        next: (res) => {
          this.members = res.data as FamilyMember[];
          this.totalRecords = res.total;
          this.loading = false;
          this.inflight = false;
        },
        error: (err) => {
          const errorMessage = err.error?.message
            ? Array.isArray(err.error.message)
              ? err.error.message.join(', ')
              : err.error.message
            : 'Failed to load family members. Please try again.';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage,
          });
          this.loading = false;
          this.inflight = false;
        },
      });
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

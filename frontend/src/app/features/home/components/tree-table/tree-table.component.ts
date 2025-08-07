import { Component, EventEmitter, Output, Input, inject } from '@angular/core';
import { FamilyService } from '../../../../core/services/family.service';
import { FamilyMember } from '../../../../shared/models/family-member.model';
import { TableLazyLoadEvent } from 'primeng/table';
import { SHARED_ANGULAR_IMPORTS } from '../../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../../shared/imports/shared-primeng-imports';
import { CONSTANTS } from '../../../../shared/constants/constants';
import { MessageService } from 'primeng/api';
import { debounceTime } from 'rxjs/operators';

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

  @Input() members: FamilyMember[] = [];
  totalRecords: number = 0;
  loading = false;

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

  loadMembers(event: TableLazyLoadEvent) {
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

    console.log('Sending request with params:', { page, size, sortField, sortOrder });

    this.familyService
      .getMyFamilyPaged(page, size, sortField, sortOrder)
      .pipe(debounceTime(300))
      .subscribe({
        next: (res) => {
          this.members = res.data;
          this.totalRecords = res.total;
          this.loading = false;
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
          console.error('Load members error:', err);
          this.loading = false;
        },
      });
  }
}
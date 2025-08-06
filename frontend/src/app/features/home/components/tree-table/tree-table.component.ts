import { Component, Input } from '@angular/core';
import { FamilyMember } from '../../../../shared/models/family-member.model';
import { SHARED_ANGULAR_IMPORTS } from '../../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../../shared/imports/shared-primeng-imports';

@Component({
  selector: 'app-tree-table',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './tree-table.component.html',
  styleUrl: './tree-table.component.scss',
})
export class TreeTableComponent {
  @Input() members: FamilyMember[] = [];
}

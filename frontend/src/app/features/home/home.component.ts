import { Component, OnInit, inject } from '@angular/core';
import { SHARED_ANGULAR_IMPORTS } from '../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../shared/imports/shared-primeng-imports';
import { CONSTANTS } from '../../shared/constants/constants';
import { TreeNode } from 'primeng/api';
import { FamilyService } from '../../core/services/family.service';
import { FamilyMember } from '../../shared/models/family-member.model';
import { Roles } from '../../shared/enums/roles.enum';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-home',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  CONSTANTS = CONSTANTS;
  private familyService = inject(FamilyService);

  selectedNodes!: TreeNode[];
  data: TreeNode[] = [];

ngOnInit(): void {
  this.familyService.getMyFamily().subscribe({
    next: (members) => {

      if (!members || !Array.isArray(members)) {
        this.data = [];
        return;
      }

      this.data = this.buildTree(members);
    }
  });
}

private buildTree(members: FamilyMember[]): TreeNode[] {
  if (!members || members.length === 0) return [];

  const photo = (m: FamilyMember | null) =>
    m?.photoUrl ? `${environment.apiUrl}${m.photoUrl}` : '';
  const byRole = (role: Roles) => members.find((m) => m.role === role) ?? null;

  const maternalGrandmother = byRole(Roles.MATERNAL_GRANDMOTHER);
  const maternalGrandfather = byRole(Roles.MATERNAL_GRANDFATHER);
  const paternalGrandmother = byRole(Roles.PATERNAL_GRANDMOTHER);
  const paternalGrandfather = byRole(Roles.PATERNAL_GRANDFATHER);
  const mother = byRole(Roles.MOTHER);
  const father = byRole(Roles.FATHER);
  const owner = byRole(Roles.OWNER);

  return [
    {
      expanded: true,
      type: 'person',
      data: {
        name: owner ? `${owner.firstName} ${owner.lastName}` : '',
        title: 'You',
        image: photo(owner),
      },
      children: [
        {
          expanded: true,
          type: 'person',
          data: {
            name: mother ? `${mother.firstName} ${mother.lastName}` : '',
            title: 'Mother',
            image: photo(mother),
          },
          children: [
            {
              expanded: true,
              type: 'person',
              data: {
                name: maternalGrandmother
                  ? `${maternalGrandmother.firstName} ${maternalGrandmother.lastName}`
                  : '',
                title: 'Maternal Grandmother',
                image: photo(maternalGrandmother),
              },
              children: [],
            },
            {
              expanded: true,
              type: 'person',
              data: {
                name: maternalGrandfather
                  ? `${maternalGrandfather.firstName} ${maternalGrandfather.lastName}`
                  : '',
                title: 'Maternal Grandfather',
                image: photo(maternalGrandfather),
              },
              children: [],
            },
          ],
        },
        {
          expanded: true,
          type: 'person',
          data: {
            name: father ? `${father.firstName} ${father.lastName}` : '',
            title: 'Father',
            image: photo(father),
          },
          children: [
            {
              expanded: true,
              type: 'person',
              data: {
                name: paternalGrandmother
                  ? `${paternalGrandmother.firstName} ${paternalGrandmother.lastName}`
                  : '',
                title: 'Paternal Grandmother',
                image: photo(paternalGrandmother),
              },
              children: [],
            },
            {
              expanded: true,
              type: 'person',
              data: {
                name: paternalGrandfather
                  ? `${paternalGrandfather.firstName} ${paternalGrandfather.lastName}`
                  : '',
                title: 'Paternal Grandfather',
                image: photo(paternalGrandfather),
              },
              children: [],
            },
          ],
        },
      ],
    },
  ];
}


}

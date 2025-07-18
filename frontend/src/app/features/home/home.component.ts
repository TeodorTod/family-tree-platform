// home.component.ts

import {
  Component,
  ElementRef,
  AfterViewInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import cytoscape, { ElementDefinition } from 'cytoscape';
import { FamilyService } from '../../core/services/family.service';
import { FamilyMember } from '../../shared/models/family-member.model';
import { environment } from '../../environments/environment';
import { AddRelativeDialogComponent } from '../../shared/components/add-relative-dialog/add-relative-dialog.component';
import { Observable } from 'rxjs';
import { SHARED_ANGULAR_IMPORTS } from '../../shared/imports/shared-angular-imports';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AddRelativeDialogComponent, ...SHARED_ANGULAR_IMPORTS],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements AfterViewInit {
  @ViewChild('cy', { static: true }) cyRef!: ElementRef<HTMLElement>;
  hoveredNode = signal<{ id: string; x: number; y: number } | null>(null);
  private familyService = inject(FamilyService);
  cy?: cytoscape.Core;

  selectedMember = signal<FamilyMember | null>(null);
  showAddDialog = signal(false);
  members: FamilyMember[] = [];

  ngAfterViewInit(): void {
    this.familyService.getMyFamily().subscribe((members) => {
      this.members = members; // ← populate the array
      this.renderGraph(members);
    });
  }

  zoomIn(): void {
    if (this.cy) {
      const newZoom = this.cy.zoom() * 1.2;
      this.cy.zoom({ level: newZoom, renderedPosition: { x: 0, y: 0 } });
      this.cy.center();
    }
  }

  zoomOut(): void {
    if (this.cy) {
      const newZoom = this.cy.zoom() / 1.2;
      this.cy.zoom({ level: newZoom, renderedPosition: { x: 0, y: 0 } });
      this.cy.center();
    }
  }

  private renderGraph(members: FamilyMember[]) {
  // ───────────────────────────────────────────────────────────────
  // 0) Boilerplate: container size + mobile detection
  // ───────────────────────────────────────────────────────────────
  const container = this.cyRef.nativeElement;
  const W = container.clientWidth;
  const H = container.clientHeight;
  const isMobile = W < 1400;

  // ───────────────────────────────────────────────────────────────
  // 1) Fixed generations
  // ───────────────────────────────────────────────────────────────
  const maternalGP = members.filter(m =>
    m.role === 'maternal_grandmother' || m.role === 'maternal_grandfather'
  );
  const paternalGP = members.filter(m =>
    m.role === 'paternal_grandmother' || m.role === 'paternal_grandfather'
  );
  const parents = members.filter(m =>
    m.role === 'mother' || m.role === 'father'
  );
  const ownerArr = members.filter(m => m.role === 'owner');

  // ───────────────────────────────────────────────────────────────
  // 2) Vertical tiers
  // ───────────────────────────────────────────────────────────────
  const tierYs = {
    grandparents: H * 0.10,
    parents:      isMobile ? H * 0.22 : H * 0.28,
    owner:        isMobile ? H * 0.32 : H * 0.46,
  };

  // ───────────────────────────────────────────────────────────────
  // 3) Spread functions
  // ───────────────────────────────────────────────────────────────
  const spreadDesktop = (arr: any[], y: number) =>
    arr.map((m, i) => ({
      role: m.role,
      x: ((i + 1) * (W * 0.4)) / (arr.length + 1) + W * 0.3,
      y,
    }));
  const spreadMobile = (arr: any[], y: number) =>
    arr.map((m, i) => ({
      role: m.role,
      x: ((i + 1) * W) / (arr.length + 1),
      y,
    }));

  const parentPosArr = isMobile
    ? spreadMobile(parents, tierYs.parents)
    : spreadDesktop(parents, tierYs.parents);

  // ───────────────────────────────────────────────────────────────
  // 4) Center owner between mother & father
  // ───────────────────────────────────────────────────────────────
  const motherX = parentPosArr.find(p => p.role === 'mother')!.x;
  const fatherX = parentPosArr.find(p => p.role === 'father')!.x;
  const ownerPosArr = ownerArr.map(m => ({
    role: m.role,
    x: (motherX + fatherX) / 2,
    y: tierYs.owner,
  }));

  // ───────────────────────────────────────────────────────────────
  // 5) Grandparents around parents
  // ───────────────────────────────────────────────────────────────
  const gpOffset = isMobile
    ? W * 0.08
    : Math.min(60, Math.abs(fatherX - motherX) / 2);

  const grandMatPos = maternalGP.map((g, i) => ({
    role: g.role,
    x: motherX + (i === 0 ? -gpOffset : gpOffset),
    y: tierYs.grandparents,
  }));
  const grandPatPos = paternalGP.map((g, i) => ({
    role: g.role,
    x: fatherX + (i === 0 ? -gpOffset : gpOffset),
    y: tierYs.grandparents,
  }));

  // ───────────────────────────────────────────────────────────────
  // 6) Build initial posMap for all fixed roles
  // ───────────────────────────────────────────────────────────────
  const posMap = new Map<string, { x: number; y: number }>();
  parentPosArr.forEach(p    => posMap.set(p.role, { x: p.x, y: p.y }));
  ownerPosArr.forEach(p     => posMap.set(p.role, { x: p.x, y: p.y }));
  grandMatPos.forEach(p     => posMap.set(p.role, { x: p.x, y: p.y }));
  grandPatPos.forEach(p     => posMap.set(p.role, { x: p.x, y: p.y }));

  // ───────────────────────────────────────────────────────────────
  // 7) Handle all the “dynamic” roles you injected via baseRole_relation
  //    by grouping _per_ baseRole, then fanning each relation out.
  // ───────────────────────────────────────────────────────────────

  // 7a) First collect just the dynamic ones
  const fixedKeys = [
    'owner','mother','father',
    'maternal_grandmother','maternal_grandfather',
    'paternal_grandmother','paternal_grandfather'
  ];
  const dynamic = members.filter(m => !fixedKeys.includes(m.role));

  // 7b) Group by their baseRole (the part before the last underscore)
  const byBase = dynamic.reduce((map, m) => {
    const idx = m.role.lastIndexOf('_');
    if (idx < 0) return map;
    const base = m.role.slice(0, idx);
    (map[base] = map[base] || []).push(m);
    return map;
  }, {} as Record<string, FamilyMember[]>);

  // 7c) For each baseRole group, spread siblings⇢right, partners⇢left, children⇢down
 Object.entries(byBase).forEach(([baseRole, group]) => {
  const basePos = posMap.get(baseRole);
  if (!basePos) return;

  const shiftH = isMobile ? W * 0.1 : 100;
  const shiftV = tierYs.owner - tierYs.parents;

  // ─ siblings ─
const sibs = group.filter(m =>
  m.role.endsWith('_brother') || m.role.endsWith('_sister')
);
if (sibs.length) {
  // figure out which generation we’re in (grandparents / parents / owner)
  let generationYs: number[];
  if (baseRole.startsWith('maternal_') || baseRole.startsWith('paternal_')) {
    generationYs = [ tierYs.grandparents ];
  } else if (baseRole === 'mother' || baseRole === 'father') {
    generationYs = [ tierYs.parents ];
  } else {
    generationYs = [ tierYs.owner ];
  }

  // collect all fixed nodes’ x in that generation
  const fixedXs = members
    .map(m => posMap.get(m.role))
    .filter((pos): pos is { x:number; y:number } =>
      !!pos && generationYs.includes(pos.y)
    )
    .map(pos => pos.x);

  // decide direction & anchor point
  const shiftH = isMobile ? W * 0.1 : 100;
  const isFatherBase = baseRole === 'father' || baseRole.startsWith('paternal_');
  const anchorX = isFatherBase
    // left edge
    ? (fixedXs.length ? Math.min(...fixedXs) : basePos.x)
    // right edge
    : (fixedXs.length ? Math.max(...fixedXs) : basePos.x);

  sibs.forEach((m, i) => {
    posMap.set(m.role, {
      x: isFatherBase
         // fan out left
         ? anchorX - shiftH * (i + 1)
         // fan out right
         : anchorX + shiftH * (i + 1),
      y: basePos.y
    });
  });
}
  // ─ partners ─ (unchanged)
  const parts = group.filter(m => m.role.endsWith('_partner'));
  parts.forEach((m, i) => {
    posMap.set(m.role, {
      x: basePos.x - shiftH * (i + 1),
      y: basePos.y
    });
  });

  // ─ children ─ (unchanged)
  const kids = group.filter(m =>
    m.role.endsWith('_son') || m.role.endsWith('_daughter')
  );
  kids.forEach((m, i) => {
    const totalW = (kids.length - 1) * shiftH;
    posMap.set(m.role, {
      x: basePos.x - totalW / 2 + shiftH * i,
      y: basePos.y + shiftV
    });
  });
});

  // ───────────────────────────────────────────────────────────────
  // 8) Build cytoscape elements (nodes + edges)
  // ───────────────────────────────────────────────────────────────
  const elements: ElementDefinition[] = [];

  // 8a) Nodes
  members.forEach(m => {
    const { x, y } = posMap.get(m.role)!;
    elements.push({
      data: {
        id:     m.role,
        label:  `${m.firstName} ${m.lastName}\n${new Date(m.dob).getFullYear()}`,
        gender: m.gender?.toLowerCase(),
        photo:  m.photoUrl ? `${environment.apiUrl}${m.photoUrl}` : 'assets/user.svg'
      },
      position: { x, y }
    });
  });

  // 8b) Fixed edges
  const connect = (s: string, t: string) => {
    if (posMap.has(s) && posMap.has(t)) {
      elements.push({ data: { source: s, target: t } });
    }
  };
  connect('maternal_grandmother','mother');
  connect('maternal_grandfather','mother');
  connect('paternal_grandmother','father');
  connect('paternal_grandfather','father');
  connect('mother','father');
  connect('mother','owner');
  connect('father','owner');

  // 8c) Dynamic edges back to each baseRole
  dynamic.forEach(m => {
    const idx = m.role.lastIndexOf('_');
    if (idx < 0) return;
    const base = m.role.slice(0, idx);
    if (posMap.has(base)) {
      elements.push({ data: { source: base, target: m.role } });
    }
  });

  // ───────────────────────────────────────────────────────────────
  // 9) Instantiate & style Cytoscape
  // ───────────────────────────────────────────────────────────────
  this.cy = cytoscape({
    container,
    elements,
    layout: { name: 'preset', fit: true, padding: 20 },
    style: [
      {
        selector: 'node', style: {
          label:             'data(label)',
          'text-wrap':       'wrap',
          'text-max-width':  '80px',
          'text-valign':     'bottom',
          'text-halign':     'center',
          'font-size':       isMobile ? '12px' : '13px',
          'background-image':'data(photo)',
          'background-fit':   'cover',
          'background-opacity': 0.9,
          width:             isMobile ? '60px' : '70px',
          height:            isMobile ? '60px' : '70px',
          shape:             'ellipse',
          color:             '#fff',
          'text-outline-color':'#000',
          'text-outline-width':2,
          'border-width':    2,
          'border-color':    '#888'
        }
      },
      { selector: 'node[gender="male"]',   style:{ 'border-color':'#51a7f9' } },
      { selector: 'node[gender="female"]', style:{ 'border-color':'#f772b0' } },
      { selector: 'node[id="owner"]',      style:{ 'border-color':'#007bff' } },
      { selector: 'edge', style:{
          width:           2,
          'line-color':    '#ccc',
          'curve-style':   'straight',
          'target-arrow-shape':'none'
        }
      }
    ]
  });

  // final zoom & pan
  this.cy.zoom(isMobile ? 0.7 : 0.9);
  this.cy.center();
  this.cy.panBy({ x: 0, y: container.clientHeight * 0.2 });

  // ───────────────────────────────────────────────────────────────
  // 10) Hover & click handlers for your “+” overlay
  // ───────────────────────────────────────────────────────────────
  this.cy.on('mouseover','node', evt => {
    const pos = evt.target.renderedPosition();
    this.hoveredNode.set({ id: evt.target.id(), x: pos.x, y: pos.y });
  });
  this.cy.on('mouseout','node', () => {
    setTimeout(() => {
      if (!document.querySelector('.node-actions:hover')) {
        this.hoveredNode.set(null);
      }
    }, 3000);
  });
  this.cy.on('tap','node', evt => {
    const targetEl = (evt.originalEvent as any).target as HTMLElement;
    if (!targetEl.closest('.node-actions')) {
      const pos = evt.target.renderedPosition();
      this.hoveredNode.set({ id: evt.target.id(), x: pos.x, y: pos.y });
    }
  });
}


  handleAddRelative(event: {
    member: Partial<FamilyMember>;
    relation: string;
  }) {
    const base = this.selectedMember();
    if (!base) return;

    // 1) Build a composite role like "owner_brother" or "mother_son"
    const newRole = `${base.role}_${event.relation}`;

    // 2) Stamp that into your new member object
    const newMember: FamilyMember = {
      ...event.member,
      role: newRole,
    } as FamilyMember;

    // 3) Create via the role-specific endpoint
    (
      this.familyService.createMemberByRole(
        newRole,
        newMember
      ) as Observable<FamilyMember>
    ).subscribe((created) => {
      // 4) Determine the relationship type for the edge
      let relationshipType = '';
      switch (event.relation) {
        case 'son':
        case 'daughter':
          relationshipType = 'parent';
          break;
        case 'brother':
        case 'sister':
          relationshipType = 'sibling';
          break;
        case 'partner':
          relationshipType = 'partner';
          break;
      }

      // 5) Link them in the graph
      this.familyService
        .createRelationship({
          fromMemberId: base.id!,
          toMemberId: created.id!,
          type: relationshipType,
        })
        .subscribe(() => {
          // 6) Close dialog and refresh
          this.showAddDialog.set(false);
          this.selectedMember.set(null);
          this.familyService.getMyFamily().subscribe((members) => {
            this.members = members;
            this.renderGraph(members);
          });
        });
    });
  }

  openAddDialog(role: string | undefined | null) {
    if (!role || !this.members.length) return;
    const member = this.members.find((m) => m.role === role);
    if (member) {
      this.selectedMember.set(member);
      this.showAddDialog.set(true);
    }
  }

  editMember() {
    alert('Edit coming soon!');
  }

  handleActionClick(event: MouseEvent) {
    event.stopPropagation();
  }
}

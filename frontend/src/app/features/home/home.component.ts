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
import { Router } from '@angular/router';
import { SHARED_PRIMENG_IMPORTS } from '../../shared/imports/shared-primeng-imports';
import { CONSTANTS } from '../../shared/constants/constants';
import { Roles } from '../../shared/enums/roles.enum';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    AddRelativeDialogComponent,
    ...SHARED_ANGULAR_IMPORTS,
    ...SHARED_PRIMENG_IMPORTS,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements AfterViewInit {
  CONSTANTS = CONSTANTS;
  @ViewChild('cy', { static: true }) cyRef!: ElementRef<HTMLElement>;
  hoveredNode = signal<{ id: string; x: number; y: number } | null>(null);
  private familyService = inject(FamilyService);
  router = inject(Router);
  cy?: cytoscape.Core;

  selectedMember = signal<FamilyMember | null>(null);
  showAddDialog = signal(false);
  members: FamilyMember[] = [];
  showConnections = signal(true);
  backgroundIndex = signal(0);
  backgroundOpacityValue = 0.6;
  backgroundOpacity = signal(this.backgroundOpacityValue.toString());

  ngAfterViewInit(): void {
    this.familyService.getMyFamily().subscribe((members) => {
      this.members = members;
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
    const maternalGP = members.filter(
      (m) =>
        m.role === Roles.MATERNAL_GRANDMOTHER ||
        m.role === Roles.MATERNAL_GRANDFATHER
    );
    const paternalGP = members.filter(
      (m) =>
        m.role === Roles.PATERNAL_GRANDMOTHER ||
        m.role === Roles.PATERNAL_GRANDFATHER
    );
    const parents = members.filter(
      (m) => m.role === Roles.MOTHER || m.role === Roles.FATHER
    );
    const ownerArr = members.filter((m) => m.role === Roles.OWNER);

    // ───────────────────────────────────────────────────────────────
    // 2) Vertical tiers
    // ───────────────────────────────────────────────────────────────
    const tierYs = {
      grandparents: H * 0.1,
      parents: isMobile ? H * 0.22 : H * 0.28,
      owner: isMobile ? H * 0.32 : H * 0.46,
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
    const spreadMobile = (arr: any[], y: number) => {
      const maxWidth = W * 0.95;
      const maxSpacing = 150;
      const minSpacing = 80;
      const spacing = Math.min(
        maxSpacing,
        Math.max(minSpacing, maxWidth / (arr.length + 0.5))
      );
      const totalWidth = (arr.length - 1) * spacing;
      const startX = W / 2 - totalWidth / 2;

      return arr.map((m, i) => ({
        role: m.role,
        x: startX + i * spacing,
        y,
      }));
    };

    const parentPosArr = isMobile
      ? spreadMobile(parents, tierYs.parents)
      : spreadDesktop(parents, tierYs.parents);

    // ───────────────────────────────────────────────────────────────
    // 4) Center owner between mother & father
    // ───────────────────────────────────────────────────────────────
    const motherX = parentPosArr.find((p) => p.role === Roles.MOTHER)!.x;
    const fatherX = parentPosArr.find((p) => p.role === Roles.FATHER)!.x;
    const ownerPosArr = ownerArr.map((m) => ({
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
    parentPosArr.forEach((p) => posMap.set(p.role, { x: p.x, y: p.y }));
    ownerPosArr.forEach((p) => posMap.set(p.role, { x: p.x, y: p.y }));
    grandMatPos.forEach((p) => posMap.set(p.role, { x: p.x, y: p.y }));
    grandPatPos.forEach((p) => posMap.set(p.role, { x: p.x, y: p.y }));

    // ───────────────────────────────────────────────────────────────
    // 7) Handle all the “dynamic” roles you injected via baseRole_relation
    //    by grouping _per_ baseRole, then fanning each relation out.
    // ───────────────────────────────────────────────────────────────

    // 7a) First collect just the dynamic ones
    const fixedKeys = [
      Roles.OWNER,
      Roles.MOTHER,
      Roles.FATHER,
      Roles.MATERNAL_GRANDMOTHER,
      Roles.MATERNAL_GRANDFATHER,
      Roles.PATERNAL_GRANDMOTHER,
      Roles.PATERNAL_GRANDFATHER,
    ];
    const dynamic = members.filter((m) => !fixedKeys.includes(m.role as Roles));

    // 7b) Group by their baseRole (the part before the last underscore)
    const byBase = dynamic.reduce((map, m) => {
      const idx = m.role.lastIndexOf('_');
      if (idx < 0) return map;
      const base = m.role.slice(0, idx);
      (map[base] = map[base] || []).push(m);
      return map;
    }, {} as Record<string, FamilyMember[]>);

    // 7c) Multi-pass placement: always wait until a baseRole is in posMap
    const remaining = { ...byBase };
    let didPlace: boolean;

    do {
      didPlace = false;

      for (const [baseRole, group] of Object.entries(remaining)) {
        const basePos = posMap.get(baseRole);
        if (!basePos) {
          // we can’t place this group yet – its parent hasn’t been placed
          continue;
        }

        // ── now place every child of this baseRole exactly as you did before ──

        const shiftH = isMobile ? W * 0.1 : 100;
        const shiftVUp = tierYs.parents - tierYs.owner;
        const shiftVDown = tierYs.owner - tierYs.parents;

        // (a) dynamic parents (_mother/_father)
        const dynParents = group.filter((m) =>
          /_(mother|father)$/.test(m.role)
        );
        dynParents.forEach((m, i) => {
          const offsetX = shiftH * (i + 1);
          const x = m.role.endsWith('_mother')
            ? basePos.x - offsetX
            : basePos.x + offsetX;
          let y: number;
          if (basePos.y === tierYs.owner) y = tierYs.parents;
          else if (basePos.y === tierYs.parents) y = tierYs.grandparents;
          else y = basePos.y - shiftVDown;
          posMap.set(m.role, { x, y });
        });

        // (b) siblings (_brother/_sister)
        const sibs = group.filter((m) => /_(brother|sister)$/.test(m.role));
        if (sibs.length) {
          const genY =
            baseRole.startsWith('maternal_') || baseRole.startsWith('paternal_')
              ? tierYs.grandparents
              : [Roles.MOTHER, Roles.FATHER].includes(baseRole as Roles)
              ? tierYs.parents
              : tierYs.owner;

          const fixedXs = members
            .map((m) => posMap.get(m.role))
            .filter((p) => p?.y === genY)
            .map((p) => p!.x);

          const isFatherBase =
            baseRole === Roles.FATHER || baseRole.startsWith('paternal_');
          const anchorX = fixedXs.length
            ? isFatherBase
              ? Math.min(...fixedXs)
              : Math.max(...fixedXs)
            : basePos.x;

          sibs.forEach((m, i) => {
            const x = isFatherBase
              ? anchorX - shiftH * (i + 1)
              : anchorX + shiftH * (i + 1);
            posMap.set(m.role, { x, y: basePos.y });
          });
        }

        // (c) partners
        group
          .filter((m) => m.role.endsWith('_partner'))
          .forEach((m, i) => {
            posMap.set(m.role, {
              x: basePos.x - shiftH * (i + 1),
              y: basePos.y,
            });
          });

        // (d) children (_son/_daughter)
        const kids = group.filter((m) => /_(son|daughter)$/.test(m.role));
        if (kids.length) {
          const totalW = (kids.length - 1) * shiftH;
          kids.forEach((m, i) => {
            const x = basePos.x - totalW / 2 + shiftH * i;
            const y = basePos.y + shiftVDown;
            posMap.set(m.role, { x, y });
          });
        }

        // we successfully placed everyone in this group—remove it
        delete remaining[baseRole];
        didPlace = true;
      }

      // if we placed something, try another pass in case
      // that unlocked deeper nests of dynamic roles
    } while (didPlace && Object.keys(remaining).length);
    // ───────────────────────────────────────────────────────────────
    // 8) Build cytoscape elements (nodes + edges)
    // ───────────────────────────────────────────────────────────────
    const elements: ElementDefinition[] = [];

    // 8a) Nodes
    members.forEach((m) => {
      const { x, y } = posMap.get(m.role)!;
      elements.push({
        data: {
          id: m.role,
          label: `${m.firstName} ${m.lastName}\n${new Date(
            m.dob
          ).getFullYear()}`,
          gender: m.gender?.toLowerCase(),
          photo: m.photoUrl
            ? `${environment.apiUrl}${m.photoUrl}`
            : 'assets/images/user.svg',
        },
        position: { x, y },
      });
    });

    // 8b) Fixed edges
    const connect = (s: string, t: string) => {
      if (posMap.has(s) && posMap.has(t)) {
        elements.push({ data: { source: s, target: t } });
      }
    };
    connect(Roles.MATERNAL_GRANDMOTHER, Roles.MOTHER);
    connect(Roles.MATERNAL_GRANDFATHER, Roles.MOTHER);
    connect(Roles.PATERNAL_GRANDMOTHER, Roles.FATHER);
    connect(Roles.PATERNAL_GRANDFATHER, Roles.FATHER);
    connect(Roles.MOTHER, Roles.FATHER);
    connect(Roles.MOTHER, Roles.OWNER);
    connect(Roles.FATHER, Roles.OWNER);

    // 8b2) Fallback partner connections based on shared role prefix (e.g., "maternal", "paternal", "owner", etc.)
    const partnerCandidates: Record<string, FamilyMember[]> = {};

    // Group by role prefix
    members.forEach((m) => {
      const parts = m.role.split('_');
      if (parts.length < 2) return;

      const prefix = parts.slice(0, -1).join('_'); // e.g. maternal_grand
      partnerCandidates[prefix] = partnerCandidates[prefix] || [];
      partnerCandidates[prefix].push(m);
    });

    // For each group, check if there's one 'mother' and one 'father' (or grandmother + grandfather)
    Object.entries(partnerCandidates).forEach(([prefix, group]) => {
      const roles = group.map((m) => m.role);

      // Try to find mother+father pair or grandmother+grandfather
      const pairings: [string, string][] = [
        [`${prefix}_mother`, `${prefix}_father`],
        [`${prefix}_father`, `${prefix}_mother`],
        [`${prefix}_grandmother`, `${prefix}_grandfather`],
        [`${prefix}_grandfather`, `${prefix}_grandmother`],
      ];

      pairings.forEach(([r1, r2]) => {
        if (
          posMap.has(r1) &&
          posMap.has(r2) &&
          !elements.some(
            (el) =>
              el.data.source === r1 &&
              el.data.target === r2 &&
              el.data['relationship'] === 'partner'
          )
        ) {
          elements.push(
            {
              data: {
                source: r1,
                target: r2,
                relationship: 'partner',
              },
            },
            {
              data: {
                source: r2,
                target: r1,
                relationship: 'partner',
              },
            }
          );
        }
      });
    });

    // 8c) Dynamic edges: hook up every dynamic node m…
    dynamic.forEach((m) => {
      // 1) peel off its “baseRole” (everything before the final underscore)
      const idx = m.role.lastIndexOf('_');
      if (idx < 0) return;
      const base = m.role.slice(0, idx);
      if (!posMap.has(base)) return;

      // 2) if m is a generated parent (mother or father)…
      if (/_mother$|_father$/.test(m.role)) {
        // a) connect to *all* of base’s children & siblings:
        [
          base, // the base node itself
          `${base}_son`,
          `${base}_daughter`,
          `${base}_brother`,
          `${base}_sister`,
        ].forEach((childRole) => {
          if (posMap.has(childRole)) {
            elements.push({
              data: { source: m.role, target: childRole },
            });
          }
        });

        // b) also connect to base’s partner (the “other” parent), if present:
        //    e.g. base="paternal_grandmother_sister", m endsWith "_father" ⇒
        //         partnerRole="paternal_grandmother_mother"
        const personIdx = base.lastIndexOf('_');
        const basePerson = personIdx > 0 ? base.slice(0, personIdx) : base;
        const partnerRel = m.role.endsWith('_father') ? 'mother' : 'father';
        const partnerRole = `${basePerson}_${partnerRel}`;

        if (posMap.has(partnerRole)) {
          elements.push({
            data: { source: m.role, target: partnerRole },
          });
        }
      }
      // 3) else if m is a partner role, draw base ↔ partner:
      else if (m.role.endsWith('_partner')) {
        elements.push({
          data: { source: base, target: m.role },
        });
      }
      // 4) otherwise (siblings, children): keep the normal base → m link
      else {
        elements.push({
          data: { source: base, target: m.role },
        });
      }
    });

    // NEW: 8e) “Raw” parentOf + childOf relationships
    // ─────────────────────────────────────────────
    members.forEach((m) => {
      // every parentOf ⇒ m → child
      (m.parentOf || []).forEach((rel) => {
        const source = m;
        const target = members.find((x) => x.id === rel.toMemberId);
        if (!target) return;
        elements.push({
          data: {
            source: source.role,
            target: target.role,
            relationship: rel.type,
          },
        });
      });

      // every childOf ⇒ parent → m
      (m.childOf || []).forEach((rel) => {
        const source = members.find((x) => x.id === rel.fromMemberId);
        const target = m;
        if (!source) return;
        elements.push({
          data: {
            source: source.role,
            target: target.role,
            relationship: rel.type,
          },
        });
      });
    });

    members
      .filter((m) => m.role.endsWith('_partner'))
      .forEach((m) => {
        const base = m.role.slice(0, m.role.lastIndexOf('_'));
        if (posMap.has(base)) {
          elements.push({
            data: {
              source: base,
              target: m.role,
              relationship: 'partner',
            },
          });
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
          selector: 'node',
          style: {
            label: 'data(label)',
            'text-wrap': 'wrap',
            'text-max-width': '80px',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'font-size': isMobile ? '13px' : '14px',
            'font-family': 'Inter, system-ui, sans-serif',
            'background-image': 'data(photo)',
            'background-fit': 'cover',

            width: isMobile ? '60px' : '70px',
            height: isMobile ? '60px' : '70px',
            shape: 'ellipse',
            color: '#fff',
            'text-outline-color': '#000',
            'text-outline-width': 2,
            'border-width': 2,
          },
        },
        {
          selector: 'node[id="owner"]',
          style: {
            'border-color': '#2d4c2f',
          },
        },

        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#666',
            'curve-style': 'straight',
            'target-arrow-shape': 'none',
          },
        },
      ],
    });

    // final zoom & pan
    this.cy.zoom(isMobile ? 0.7 : 0.9);
    this.cy.center();
    this.cy.panBy({ x: 0, y: container.clientHeight * 0.2 });
    this.cy.resize();
    this.cy.fit();

    // ───────────────────────────────────────────────────────────────
    // 10) Hover & click handlers for your “+” overlay
    // ───────────────────────────────────────────────────────────────
    this.cy.on('mouseover', 'node', (evt) => {
      const pos = evt.target.renderedPosition();
      this.hoveredNode.set({ id: evt.target.id(), x: pos.x, y: pos.y });
    });
    this.cy.on('mouseout', 'node', () => {
      setTimeout(() => {
        if (!document.querySelector('.node-actions:hover')) {
          this.hoveredNode.set(null);
        }
      }, 3000);
    });
    this.cy.on('tap', 'node', (evt) => {
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
        case 'mother':
        case 'father':
          relationshipType = 'parent';
          break;
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
    this.hoveredNode.set(null);
  }

  editMember() {
    const hovered = this.hoveredNode();
    if (!hovered) return;

    const member = this.members.find((m) => m.role === hovered.id);
    if (member) {
      this.router.navigate([CONSTANTS.ROUTES.MEMBER, member.role]);
    }
  }

  handleActionClick(event: MouseEvent) {
    event.stopPropagation();
  }

  toggleConnections() {
    this.showConnections.set(!this.showConnections());
    this.toggleEdgeVisibility();
  }

  private toggleEdgeVisibility() {
    if (!this.cy) return;
    this.cy.edges().forEach((edge) => {
      edge.style('display', this.showConnections() ? 'element' : 'none');
    });
  }

  backgroundImages = [
    'assets/images/background/background_main.png',
    'assets/images/background/background_1.png',
    'assets/images/background/background_2.png',
    'assets/images/background/background_3.png',
    'assets/images/background/background_4.png',
  ];

  backgroundUrl() {
    return this.backgroundImages[this.backgroundIndex()];
  }

  updateBackgroundOpacity() {
    this.backgroundOpacity.set(this.backgroundOpacityValue.toString());
  }

  openBackgroundDialog() {
    // TODO: open a modal with selection logic — you can trigger a p-dialog here
  }
}

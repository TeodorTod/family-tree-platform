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
import { ActivatedRoute, Router } from '@angular/router';
import { SHARED_PRIMENG_IMPORTS } from '../../shared/imports/shared-primeng-imports';
import { CONSTANTS } from '../../shared/constants/constants';
import { Roles } from '../../shared/enums/roles.enum';
import { PhotoPickerDialogComponent } from './components/photo-picker-dialog/photo-picker-dialog.component';
import { BackgroundPickerDialogComponent } from './components/background-picker-dialog/background-picker-dialog.component';
import { BACKGROUND_IMAGES } from '../../shared/constants/background-images';
import { TreeTableComponent } from './components/tree-table/tree-table.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    AddRelativeDialogComponent,
    PhotoPickerDialogComponent,
    BackgroundPickerDialogComponent,
    TreeTableComponent,
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
  private route = inject(ActivatedRoute);
  router = inject(Router);
  cy?: cytoscape.Core;

  selectedMember = signal<FamilyMember | null>(null);
  showAddDialog = signal(false);
  members: FamilyMember[] = [];
  showConnections = signal(false);
  backgroundIndex = signal(0);
  backgroundOpacityValue = 0.6;
  backgroundOpacity = signal(this.backgroundOpacityValue.toString());
  showPhotoPickerDialog = signal(false);
  showBackgroundDialog = signal(false);
  showTableView = signal(false);
  customPhotoUrl =
    localStorage.getItem('familyPhotoUrl') ??
    'assets/images/user-image/user.svg';

  ngAfterViewInit(): void {
    const viewMode = this.route.snapshot.queryParamMap.get('view');
    if (viewMode === 'table') {
      this.showTableView.set(true);
    } else {
      this.showTableView.set(false);
    }

    const savedBg = localStorage.getItem('selectedBackground');
    if (savedBg && this.backgroundImages.includes(savedBg)) {
      this.backgroundIndex.set(this.backgroundImages.indexOf(savedBg));
    } else {
      this.backgroundIndex.set(0);
    }

    this.familyService.getMyFamily().subscribe((members) => {
      this.members = members;
      this.renderGraph(members);
      this.toggleEdgeVisibility();
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

  openPhotoPickerDialog() {
    this.showPhotoPickerDialog.set(true);
  }

  handlePhotoSelection(photoUrl: string) {
    // Persist the pick
    localStorage.setItem('familyPhotoUrl', photoUrl);
    this.customPhotoUrl = photoUrl;

    if (!this.cy) return;
    // Apply to everyone
    this.cy.nodes().forEach((node) => {
      node.data('photo', photoUrl);
      node.style('background-image', `url(${photoUrl})`);
    });
    this.cy.style().update();
    this.showPhotoPickerDialog.set(false);
  }

  private renderGraph(members: FamilyMember[]) {
    const defaultPhoto = this.customPhotoUrl;
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
          // we can't place this group yet – its parent hasn't been placed
          continue;
        }

        // ── now place every child of this baseRole exactly as you did before ──

        const shiftH = isMobile ? W * 0.1 : 100;
        const shiftVUp = tierYs.parents - tierYs.owner;
        const shiftVDown = tierYs.owner - tierYs.parents;

        // Determine which side this family branch belongs to
        const centerX = W / 2;
        const isFatherSide =
          baseRole === Roles.FATHER ||
          baseRole.startsWith('paternal_') ||
          baseRole.includes('_father') ||
          basePos.x < centerX;

        const isMotherSide =
          baseRole === Roles.MOTHER ||
          baseRole.startsWith('maternal_') ||
          baseRole.includes('_mother') ||
          basePos.x > centerX;

        // (a) dynamic parents (_mother/_father)
        const dynParents = group.filter((m) =>
          /_(mother|father)$/.test(m.role)
        );
        dynParents.forEach((m, i) => {
          const offsetX = shiftH * (i + 1);
          let x = m.role.endsWith('_mother')
            ? basePos.x - offsetX
            : basePos.x + offsetX;

          let y: number;
          if (basePos.y === tierYs.owner) y = tierYs.parents;
          else if (basePos.y === tierYs.parents) y = tierYs.grandparents;
          else y = basePos.y - shiftVDown;

          // SIDE ENFORCEMENT: Keep father's family on left, mother's family on right
          if (isFatherSide) {
            x = Math.min(x, centerX - 20); // Keep on left side with small buffer
          } else if (isMotherSide) {
            x = Math.max(x, centerX + 20); // Keep on right side with small buffer
          }

          // Keep within screen bounds
          x = Math.max(W * 0.05, Math.min(W * 0.95, x));

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
            let x = isFatherBase
              ? anchorX - shiftH * (i + 1)
              : anchorX + shiftH * (i + 1);

            // SIDE ENFORCEMENT: Keep siblings on correct side
            if (isFatherSide) {
              x = Math.min(x, centerX - 20);
            } else if (isMotherSide) {
              x = Math.max(x, centerX + 20);
            }

            // Keep within screen bounds
            x = Math.max(W * 0.05, Math.min(W * 0.95, x));

            posMap.set(m.role, { x, y: basePos.y });
          });
        }

        // (c) partners
        group
          .filter((m) => m.role.endsWith('_partner'))
          .forEach((m, i) => {
            let x = basePos.x - shiftH * (i + 1);

            // SIDE ENFORCEMENT: Keep partners on correct side
            if (isFatherSide) {
              x = Math.min(x, centerX - 20);
            } else if (isMotherSide) {
              x = Math.max(x, centerX + 20);
            }

            // Keep within screen bounds
            x = Math.max(W * 0.05, Math.min(W * 0.95, x));

            posMap.set(m.role, {
              x,
              y: basePos.y,
            });
          });

        // (d) children (_son/_daughter)
        const kids = group.filter((m) => /_(son|daughter)$/.test(m.role));
        if (kids.length) {
          const totalW = (kids.length - 1) * shiftH;
          kids.forEach((m, i) => {
            let x = basePos.x - totalW / 2 + shiftH * i;
            const y = basePos.y + shiftVDown;

            // SIDE ENFORCEMENT: Keep children on correct side
            if (isFatherSide) {
              x = Math.min(x, centerX - 20);
            } else if (isMotherSide) {
              x = Math.max(x, centerX + 20);
            }

            // Keep within screen bounds
            x = Math.max(W * 0.05, Math.min(W * 0.95, x));

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

    // ───────────────────────────────────────────────────────────────
    // 8a⁺) Clamp every maternal node to the right of Owner, paternal to left
    // ───────────────────────────────────────────────────────────────
    const ownerX = posMap.get(Roles.OWNER)!.x;
    const nodeSize = isMobile ? 60 : 70;
    // increase this to add more horizontal breathing room
    const sideBuffer = nodeSize + 5;

    posMap.forEach((pos, role) => {
      if (role === Roles.OWNER) return;

      // every maternal node (and Mother)
      if (role.startsWith('maternal_') || role === Roles.MOTHER) {
        pos.x = Math.max(pos.x, ownerX + sideBuffer);
      }
      // every paternal node (and Father)
      else if (role.startsWith('paternal_') || role === Roles.FATHER) {
        pos.x = Math.min(pos.x, ownerX - sideBuffer);
      }
    });

    // ───────────────────────────────────────────────────────────────
    // 8a⁺¹) Tiny horizontal collision-avoidance
    // ───────────────────────────────────────────────────────────────
    const minDist = nodeSize + 10; // no two circles closer than this in X
    const entries = Array.from(posMap.entries());

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [ra, pa] = entries[i];
        const [rb, pb] = entries[j];

        // only worry about nodes on roughly the same horizontal band
        if (Math.abs(pa.y - pb.y) < nodeSize) {
          const dx = pb.x - pa.x;
          const absDx = Math.abs(dx);

          if (absDx < minDist) {
            const shift = (minDist - absDx) / 2;
            // push them apart
            if (dx > 0) {
              pa.x -= shift;
              pb.x += shift;
            } else {
              pa.x += shift;
              pb.x -= shift;
            }
            posMap.set(ra, pa);
            posMap.set(rb, pb);
          }
        }
      }
    }

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
            : defaultPhoto,
        },
        position: { x, y },
      });
    });

    // 8b) Fixed edges between core family members
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

    // Partner connections for core family members only
    const corePartnerPairs: [string, string][] = [
      [Roles.MATERNAL_GRANDMOTHER, Roles.MATERNAL_GRANDFATHER],
      [Roles.PATERNAL_GRANDMOTHER, Roles.PATERNAL_GRANDFATHER],
      [Roles.MOTHER, Roles.FATHER],
    ];

    corePartnerPairs.forEach(([r1, r2]) => {
      if (posMap.has(r1) && posMap.has(r2)) {
        elements.push({
          data: { source: r1, target: r2, relationship: 'partner' },
        });
      }
    });

    // 8c) Dynamic edges: hook up every dynamic node m…
    dynamic.forEach((m) => {
      // 1) peel off its "baseRole" (everything before the final underscore)
      const idx = m.role.lastIndexOf('_');
      if (idx < 0) return;
      const base = m.role.slice(0, idx);
      if (!posMap.has(base)) return;

      // 2) if m is a generated parent (mother or father)…
      if (/_mother$|_father$/.test(m.role)) {
        // a) connect ONLY to direct children of the base person:
        [`${base}_son`, `${base}_daughter`].forEach((childRole) => {
          if (posMap.has(childRole)) {
            elements.push({
              data: { source: m.role, target: childRole },
            });
          }
        });

        // b) connect to the base person themselves (parent-child relationship)
        elements.push({
          data: { source: m.role, target: base },
        });

        // c) connect to partner ONLY if they are at the same generational level and share the same base:
        const currentRoleParts = m.role.split('_');
        const currentRelation = currentRoleParts[currentRoleParts.length - 1]; // 'father' or 'mother'
        const currentBasePath = currentRoleParts.slice(0, -1).join('_'); // everything except the last part

        const partnerRel = currentRelation === 'father' ? 'mother' : 'father';
        const partnerRole = `${currentBasePath}_${partnerRel}`;

        // Only connect if partner exists and they share the exact same base path
        if (posMap.has(partnerRole)) {
          elements.push({
            data: {
              source: m.role,
              target: partnerRole,
              relationship: 'partner',
            },
          });
        }
      }
      // 3) else if m is a partner role, draw base ↔ partner:
      else if (m.role.endsWith('_partner')) {
        elements.push({
          data: { source: base, target: m.role, relationship: 'partner' },
        });
      }
      // 4) siblings: connect to their base person (sibling relationship) and shared parents
      else if (/_brother$|_sister$/.test(m.role)) {
        // Connect sibling to their base person (the person they're sibling to)
        elements.push({
          data: { source: base, target: m.role, relationship: 'sibling' },
        });

        // Also connect siblings to their shared parents if they exist
        const siblingParts = m.role.split('_');
        const siblingBasePath = siblingParts.slice(0, -1).join('_'); // remove 'brother'/'sister'

        // Look for parents at the correct generational level
        const possibleParents = [
          `${siblingBasePath}_mother`,
          `${siblingBasePath}_father`,
        ];

        possibleParents.forEach((parentRole) => {
          if (posMap.has(parentRole)) {
            elements.push({
              data: { source: parentRole, target: m.role },
            });
          }
        });
      }

      // 5) children: connect to base person (parent-child relationship)
      else if (/_son$|_daughter$/.test(m.role)) {
        elements.push({
          data: { source: base, target: m.role },
        });
      }
    });

    // Handle partner relationships for dynamic members
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
      layout: { name: 'preset', fit: true, padding: 20, animate: true },
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
      this.router.navigate([CONSTANTS.ROUTES.MEMBER, member.role], {
        queryParams: { view: this.showTableView() ? 'table' : 'chart' },
      });
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

  backgroundImages = BACKGROUND_IMAGES;

  backgroundUrl() {
    return this.backgroundImages[this.backgroundIndex()];
  }

  updateBackgroundOpacity() {
    this.backgroundOpacity.set(this.backgroundOpacityValue.toString());
  }

  openBackgroundDialog() {
    this.showBackgroundDialog.set(true);
  }

  handleBackgroundSelection(url: string) {
    const index = this.backgroundImages.indexOf(url);
    if (index !== -1) {
      console.log('Selected background URL:', url, 'Index:', index);
      this.backgroundIndex.set(index);
    } else {
      console.warn(
        'Background URL not found in backgroundImages:',
        url,
        'Falling back to default index 0'
      );
      this.backgroundIndex.set(0);
    }
    this.backgroundOpacity.set(this.backgroundOpacityValue.toString());
    this.showBackgroundDialog.set(false);
  }

  toggleView() {
    const isTable = !this.showTableView();
    this.showTableView.set(isTable);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: isTable ? 'table' : 'chart' },
      queryParamsHandling: 'merge',
    });

    if (!isTable) {
      setTimeout(() => {
        this.cy?.resize().fit();
        this.backgroundOpacity.set(this.backgroundOpacityValue.toString());
      }, 0);
    }
  }

  handleEditFromTable(member: FamilyMember) {
    this.router.navigate([CONSTANTS.ROUTES.MEMBER, member.role], {
      queryParams: { view: 'table' },
    });
  }
}

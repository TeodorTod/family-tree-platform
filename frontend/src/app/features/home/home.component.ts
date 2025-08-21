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
import { forkJoin, Observable, switchMap, tap } from 'rxjs';
import { SHARED_ANGULAR_IMPORTS } from '../../shared/imports/shared-angular-imports';
import { ActivatedRoute, Router } from '@angular/router';
import { SHARED_PRIMENG_IMPORTS } from '../../shared/imports/shared-primeng-imports';
import { CONSTANTS } from '../../shared/constants/constants';
import { Roles } from '../../shared/enums/roles.enum';
import { PhotoPickerDialogComponent } from './components/photo-picker-dialog/photo-picker-dialog.component';
import { BackgroundPickerDialogComponent } from './components/background-picker-dialog/background-picker-dialog.component';
import { BACKGROUND_IMAGES } from '../../shared/constants/background-images';
import { TreeTableComponent } from './components/tree-table/tree-table.component';
import jsPDF from 'jspdf';
import { PartnerStatus } from '../../shared/enums/partner-status.enum';

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
  circleSizeValue = 60;
  circleSize = signal(this.circleSizeValue);
  exportMode = signal(false);
  exportDataUrl = signal<string | null>(null);
  exportTight = signal(false);
  exportPaddingPx = signal(64);
  bgOffsetX = signal(0);
  bgOffsetY = signal(0);
  showBirthInfo = signal<boolean>(true);
  private exportRebuildTimer: any = null;
  private distanceBoostX = 1.6;
  private distanceBoostY = 1.0;
  private lastPairs: [string, string][] = [];
  private lastMateOf = new Map<string, string>();

  customPhotoUrl =
    localStorage.getItem('familyPhotoUrl') ??
    'assets/images/user-image/user.svg';

  ngAfterViewInit(): void {
    // 1) read query param
    const viewMode = this.route.snapshot.queryParamMap.get('view');

    // 2) read saved preference
    const savedPref = localStorage.getItem('familyViewMode'); // 'table' | 'chart' | null

    // 3) detect mobile
    const isSmallScreen = window.matchMedia('(max-width: 900px)').matches;

    // 4) decide
    if (viewMode === 'table' || viewMode === 'chart') {
      this.showTableView.set(viewMode === 'table');
    } else if (savedPref === 'table' || savedPref === 'chart') {
      this.showTableView.set(savedPref === 'table');
    } else {
      // default: on mobile show table, on desktop show chart
      this.showTableView.set(isSmallScreen);
    }

    const savedBirth = localStorage.getItem('showBirthInfo');
    if (savedBirth !== null) this.showBirthInfo.set(savedBirth === '1');

    // backgrounds init (unchanged)
    const savedBg = localStorage.getItem('selectedBackground');
    if (savedBg && this.backgroundImages.includes(savedBg)) {
      this.backgroundIndex.set(this.backgroundImages.indexOf(savedBg));
    } else {
      this.backgroundIndex.set(0);
    }

    this.setInitialCircleSizeByWidth();
    requestAnimationFrame(() => this.setInitialCircleSizeByWidth());

    this.familyService.getMyFamily().subscribe((members) => {
      this.members = members;

      if (!this.showTableView()) {
        this.renderGraph(members);
        this.toggleEdgeVisibility();
        this.updateCircleSize();
      }
    });
  }

  private setInitialCircleSizeByWidth(): void {
    setTimeout(() => {
      const w = Math.max(
        window.innerWidth || 0,
        this.cyRef?.nativeElement?.clientWidth || 0
      );
      const next = w <= 1024 ? 30 : 60;

      if (this.circleSizeValue === next) return;

      this.circleSizeValue = next;
      this.circleSize.set(next);
      localStorage.setItem('familyCircleSize', String(next));

      if (this.cy) this.updateCircleSize();
    }, 0);
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

    const nodeSize = this.circleSize();
    const minSpacing = nodeSize + 10;
    const partnerSpacing = minSpacing;
    const shiftH = isMobile ? W * 0.1 : 100;

    // ───────────────────────────────────────────────────────────────
    // 1) Fixed generations
    // ───────────────────────────────────────────────────────────────
    let maternalGP = members
      .filter(
        (m) =>
          m.role === Roles.MATERNAL_GRANDMOTHER ||
          m.role === Roles.MATERNAL_GRANDFATHER
      )
      .sort((a, b) => a.role.localeCompare(b.role)); // Sort for consistent positioning: grandfather first
    let paternalGP = members
      .filter(
        (m) =>
          m.role === Roles.PATERNAL_GRANDMOTHER ||
          m.role === Roles.PATERNAL_GRANDFATHER
      )
      .sort((a, b) => a.role.localeCompare(b.role)); // Sort for consistent positioning: grandfather first
    let parents = members
      .filter((m) => m.role === Roles.MOTHER || m.role === Roles.FATHER)
      .sort((a, b) => a.role.localeCompare(b.role)); // Sort: father first
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
      const minSpacingLocal = 80;
      const spacing = Math.min(
        maxSpacing,
        Math.max(minSpacingLocal, maxWidth / (arr.length + 0.5))
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
    // 5) Grandparents around parents (keep them as a tight pair)
    // ───────────────────────────────────────────────────────────────

    // visual gap between grandfather & grandmother
    const gpMin = Math.max(nodeSize * 1.4, 100);
    const gpMax = Math.max(nodeSize * 2.2, 180);
    const gpGap = isMobile
      ? Math.max(W * 0.12, gpMin)
      : Math.min(gpMax, Math.max(gpMin, Math.abs(fatherX - motherX) * 0.45));

    const makeGpPair = (parentX: number, arr: FamilyMember[]) => {
      // make sure we place GRANDFATHER to the left, GRANDMOTHER to the right
      const gf = arr.find(
        (a) =>
          a.role === Roles.MATERNAL_GRANDFATHER ||
          a.role === Roles.PATERNAL_GRANDFATHER
      );
      const gm = arr.find(
        (a) =>
          a.role === Roles.MATERNAL_GRANDMOTHER ||
          a.role === Roles.PATERNAL_GRANDMOTHER
      );
      const y = tierYs.grandparents;
      const out: { role: string; x: number; y: number }[] = [];

      if (gf && gm) {
        out.push({ role: gf.role, x: parentX - gpGap / 2, y });
        out.push({ role: gm.role, x: parentX + gpGap / 2, y });
      } else if (gf) {
        out.push({ role: gf.role, x: parentX, y });
      } else if (gm) {
        out.push({ role: gm.role, x: parentX, y });
      }
      return out;
    };

    const grandMatPos = makeGpPair(motherX, maternalGP);
    const grandPatPos = makeGpPair(fatherX, paternalGP);

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
        let dynParents = group.filter((m) => /_(mother|father)$/.test(m.role));
        if (dynParents.length > 0) {
          let y: number;
          if (basePos.y === tierYs.owner) y = tierYs.parents;
          else if (basePos.y === tierYs.parents) y = tierYs.grandparents;
          else y = basePos.y - shiftVDown;

          const halfSpace = partnerSpacing / 2;

          const fatherM = dynParents.find((m) => m.role.endsWith('_father'));
          if (fatherM) {
            let x = basePos.x - halfSpace;
            // SIDE ENFORCEMENT
            if (isFatherSide) {
              x = Math.min(x, centerX - 20);
            } else if (isMotherSide) {
              x = Math.max(x, centerX + 20);
            }
            x = Math.max(W * 0.05, Math.min(W * 0.95, x));
            posMap.set(fatherM.role, { x, y });
          }

          const motherM = dynParents.find((m) => m.role.endsWith('_mother'));
          if (motherM) {
            let x = basePos.x + halfSpace;
            // SIDE ENFORCEMENT
            if (isFatherSide) {
              x = Math.min(x, centerX - 20);
            } else if (isMotherSide) {
              x = Math.max(x, centerX + 20);
            }
            x = Math.max(W * 0.05, Math.min(W * 0.95, x));
            posMap.set(motherM.role, { x, y });
          }
        }

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
    // increase this to add more horizontal breathing room
    const sideBuffer = nodeSize + 5;
    const ownerPos = posMap.get(Roles.OWNER)!;
    this.resolveOverlapsXOnly(posMap, nodeSize, W, ownerPos.x);

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

    const partnerGap = Math.max(this.circleSize(), 60);
    const pairs = this.collectPartnerPairs(members);
    this.lastPairs = pairs;

    const mateOf = this.enforcePartnerAdjacency(posMap, pairs, partnerGap);
    this.lastMateOf = mateOf;
    this.packRowsBySide(
      posMap,
      posMap.get(Roles.OWNER)!.x,
      W,
      this.circleSize(),
      partnerGap
    );

    {
      const ownerX = posMap.get(Roles.OWNER)!.x;
      const sideBuffer = this.circleSize() + 5;
      const pf = posMap.get(Roles.FATHER);
      if (pf) posMap.set(Roles.FATHER, { x: ownerX - sideBuffer, y: pf.y });
      const pm = posMap.get(Roles.MOTHER);
      if (pm) posMap.set(Roles.MOTHER, { x: ownerX + sideBuffer, y: pm.y });
    }

    this.resolveOverlapsXOnly(
      posMap,
      this.circleSize(),
      W,
      ownerX,
      mateOf,
      partnerGap
    );

    // ───────────────────────────────────────────────────────────────
    // 8a⁺¹) Tiny horizontal collision-avoidance
    // ───────────────────────────────────────────────────────────────
    const fixedRoles = new Set(fixedKeys);
    const entries = Array.from(posMap.entries());

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [ra, pa] = entries[i];
        const [rb, pb] = entries[j];

        // only worry about nodes on roughly the same horizontal band
        if (Math.abs(pa.y - pb.y) < nodeSize) {
          const dx = pb.x - pa.x;
          const absDx = Math.abs(dx);

          if (absDx < minSpacing) {
            const shift = (minSpacing - absDx) / 2;
            const isAFixed = fixedRoles.has(ra as Roles);
            const isBFixed = fixedRoles.has(rb as Roles);

            if (isAFixed && isBFixed) {
              // Both fixed: do not move
              continue;
            } else if (isAFixed) {
              // Move only B away from A
              if (dx > 0) {
                pb.x += shift * 2;
              } else {
                pb.x -= shift * 2;
              }
            } else if (isBFixed) {
              // Move only A away from B
              if (dx > 0) {
                pa.x -= shift * 2;
              } else {
                pa.x += shift * 2;
              }
            } else {
              // Both dynamic: push both
              if (dx > 0) {
                pa.x -= shift;
                pb.x += shift;
              } else {
                pa.x += shift;
                pb.x -= shift;
              }
            }
            posMap.set(ra, pa);
            posMap.set(rb, pb);
          }
        }
      }
    }

    const owner = posMap.get(Roles.OWNER);
    const anchorX = owner?.x ?? W / 2;
    const anchorY = owner?.y ?? tierYs.owner;
    this.boostPosMap(
      posMap,
      anchorX,
      anchorY,
      this.distanceBoostX,
      this.distanceBoostY
    );

    // 8a) Nodes
    members.forEach((m) => {
      const pos = posMap.get(m.role);
      if (!pos) return; // guard just in case

      const label = this.computeNodeLabel(m);

      elements.push({
        data: {
          id: m.role,
          label,
          gender: m.gender?.toLowerCase() ?? undefined,
          photo: m.photoUrl
            ? `${environment.apiUrl}${m.photoUrl}`
            : defaultPhoto,
        },
        position: { x: pos.x, y: pos.y },
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
            'font-size': isMobile ? '11px' : '14px',
            'font-family': 'Inter, system-ui, sans-serif',
            'background-image': 'data(photo)',
            'background-fit': 'cover',

            width: `${this.circleSize()}px`,
            height: `${this.circleSize()}px`,
            shape: 'ellipse',
            color: '#fff',
            'text-outline-color': '#000',
            'text-outline-width': 2,
            'border-width': 2,
          },
        },
        {
          selector: 'node[id = "owner"]',
          style: {
            'border-color': '#2d4c2f',
            'border-width': 6,
            'background-color': '#fff',
            'font-weight': 'bold',
            'text-outline-color': '#2d4c2f',
            'text-outline-width': 3,
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

    if (!this.showConnections()) {
      this.toggleEdgeVisibility();
    }
  }

  private birthLabel(m: FamilyMember): string {
    // prefer exact DOB year if present
    if (m.dob) {
      const d = typeof m.dob === 'string' ? new Date(m.dob) : m.dob;
      const y =
        d instanceof Date && !isNaN(d.getTime()) ? d.getFullYear() : NaN;
      if (Number.isFinite(y)) return String(y);
    }
    // else use year-only or note
    if (m.birthYear != null) return String(m.birthYear);
    if (m.birthNote) return m.birthNote;
    return '';
  }

  handleAddRelative(event: {
    member: Partial<FamilyMember>;
    relation: string;
  }) {
    const base = this.selectedMember();
    if (!base) return;

    const newRole = `${base.role}_${event.relation}`;

    const newMember: FamilyMember = {
      ...event.member,
      role: newRole,
    } as FamilyMember;

    (
      this.familyService.createMemberByRole(
        newRole,
        newMember
      ) as Observable<FamilyMember>
    )
      .pipe(
        switchMap((created) => {
          const createdMember = created;

          let relationshipType = '';
          switch (event.relation) {
            case 'mother':
            case 'father':
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

          const edge$ = this.familyService.createRelationship({
            fromMemberId: base.id!,
            toMemberId: createdMember.id!,
            type: relationshipType,
          });

          if (event.relation === 'partner') {
            return edge$.pipe(
              switchMap(() =>
                this.familyService.setPartner(
                  base.id!,
                  createdMember.id!,
                  PartnerStatus.UNKNOWN
                )
              )
            );
          }

          return edge$;
        })
      )
      .subscribe({
        next: () => {
          this.showAddDialog.set(false);
          this.selectedMember.set(null);
          this.familyService.getMyFamily().subscribe((members) => {
            this.members = members;
            this.renderGraph(members);
          });
        },
        error: (err) => {
          console.error('Failed to add relative:', err);
        },
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
    this.scheduleExportRebuild();
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

    localStorage.setItem('familyViewMode', isTable ? 'table' : 'chart');

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: isTable ? 'table' : 'chart' },
      queryParamsHandling: 'merge',
    });

    if (!isTable) {
      setTimeout(() => {
        if (!this.cy) {
          this.renderGraph(this.members);
        } else {
          this.cy?.resize().fit();
        }
        this.backgroundOpacity.set(this.backgroundOpacityValue.toString());
      }, 0);
    }
  }

  handleEditFromTable(member: FamilyMember) {
    this.router.navigate([CONSTANTS.ROUTES.MEMBER, member.role], {
      queryParams: { view: 'table' },
    });
  }

  updateCircleSize() {
    this.circleSize.set(this.circleSizeValue);
    localStorage.setItem('familyCircleSize', this.circleSizeValue.toString());

    if (!this.cy) return;

    this.cy.nodes().forEach((node) => {
      node.style({
        width: `${this.circleSizeValue}px`,
        height: `${this.circleSizeValue}px`,
        'font-size': `${Math.max(
          8,
          Math.min(16, this.circleSizeValue * 0.15)
        )}px`,
        'text-max-width': `${this.circleSizeValue * 1.2}px`,
      });
    });

    this.cy.nodes().forEach((node) => {
      const pos = node.position();
      const role = node.id();
      const ownerNode = this.cy?.nodes('[id = "owner"]')[0];
      const ownerX = ownerNode ? ownerNode.position().x : 0;
      const nodeSize = this.circleSizeValue;
      const sideBuffer = nodeSize + 5;
      const minDist = nodeSize + 10;

      if (role.startsWith('maternal_') || role === Roles.MOTHER) {
        pos.x = Math.max(pos.x, ownerX + sideBuffer);
      } else if (role.startsWith('paternal_') || role === Roles.FATHER) {
        pos.x = Math.min(pos.x, ownerX - sideBuffer);
      }

      node.position(pos);
    });

    const nodes = this.cy.nodes();
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        const pa = nodeA.position();
        const pb = nodeB.position();
        if (Math.abs(pa.y - pb.y) < this.circleSizeValue) {
          const dx = pb.x - pa.x;
          const absDx = Math.abs(dx);
          const minDist = this.circleSizeValue + 10;
          if (absDx < minDist) {
            const shift = (minDist - absDx) / 2;
            if (dx > 0) {
              pa.x -= shift;
              pb.x += shift;
            } else {
              pa.x += shift;
              pb.x -= shift;
            }
            nodeA.position(pa);
            nodeB.position(pb);
          }
        }
      }
    }

    this.cy.style().update();
    this.cy.fit();
  }

  openExportView(tight = false) {
    this.exportTight.set(tight);
    this.exportMode.set(true);
    document.body.classList.add('export-mode');
    this.resetBgOffset();
    setTimeout(() => this.buildExportImage(/*asSeen*/ true), 0);
  }

  closeExportView() {
    this.exportMode.set(false);
    this.exportDataUrl.set(null);
    document.body.classList.remove('export-mode');
  }

  private async buildExportImage(asSeen: boolean = true) {
    if (!this.cy) return;

    const dpr = window.devicePixelRatio || 2;

    const cyPngDataUrl = this.cy.png({
      full: !asSeen ? true : false,
      scale: dpr,
      bg: 'transparent',
    });

    const [cyImg, bgImg] = await Promise.all([
      this.loadImage(cyPngDataUrl),
      this.loadImage(this.backgroundUrl()).catch(() => null),
    ]);

    if (!this.exportTight()) {
      const canvas = document.createElement('canvas');
      canvas.width = cyImg.width;
      canvas.height = cyImg.height;
      const ctx = canvas.getContext('2d')!;

      this.drawBackground(ctx, canvas.width, canvas.height, bgImg);
      ctx.drawImage(cyImg, 0, 0);
      this.exportDataUrl.set(canvas.toDataURL('image/png'));
      return;
    }

    const rb = this.cy.elements().renderedBoundingBox();
    const pad = this.exportPaddingPx();
    const labelGuard = 18;
    const totalPad = pad + labelGuard;

    const cropX = Math.max((rb.x1 - totalPad) * dpr, 0);
    const cropY = Math.max((rb.y1 - totalPad) * dpr, 0);
    const cropW = Math.min(
      (rb.x2 - rb.x1 + totalPad * 2) * dpr,
      cyImg.width - cropX
    );
    const cropH = Math.min(
      (rb.y2 - rb.y1 + totalPad * 2) * dpr,
      cyImg.height - cropY
    );

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(cropW));
    canvas.height = Math.max(1, Math.round(cropH));
    const ctx = canvas.getContext('2d')!;

    this.drawBackground(ctx, canvas.width, canvas.height, bgImg);

    ctx.drawImage(
      cyImg,
      cropX,
      cropY,
      cropW,
      cropH,
      0,
      0,
      canvas.width,
      canvas.height
    );

    this.exportDataUrl.set(canvas.toDataURL('image/png'));
  }

  private drawBackground(
    ctx: CanvasRenderingContext2D,
    cw: number,
    ch: number,
    bgImg: HTMLImageElement | null
  ) {
    // Fallback to white if no image
    if (!bgImg) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, cw, ch);
      return;
    }

    // Compute cover sizing
    const bgRatio = bgImg.width / bgImg.height;
    const canvasRatio = cw / ch;
    let drawW = cw,
      drawH = ch,
      dx = 0,
      dy = 0;

    if (bgRatio > canvasRatio) {
      drawH = ch;
      drawW = bgImg.width * (ch / bgImg.height);
      dx = (cw - drawW) / 2;
    } else {
      drawW = cw;
      drawH = bgImg.height * (cw / bgImg.width);
      dy = (ch - drawH) / 2;
    }

    dx += this.bgOffsetX();
    dy += this.bgOffsetY();

    // 1) Draw the background fully opaque
    ctx.drawImage(bgImg, dx, dy, drawW, drawH);

    const alpha = this.getBgAlpha();
    const wash = 1 - alpha;

    if (wash > 0) {
      ctx.save();
      ctx.globalAlpha = wash;
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cw, ch);
      ctx.restore();
    }
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  downloadPNG() {
    const url = this.exportDataUrl();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = 'family-tree.png';
    a.click();
  }

  downloadPDF() {
    const url = this.exportDataUrl();
    if (!url) return;
    const img = new Image();
    img.onload = () => {
      const w = img.width,
        h = img.height;
      const pdf = new jsPDF({
        unit: 'px',
        format: [w, h],
        orientation: w >= h ? 'l' : 'p',
        compress: true,
      });
      pdf.addImage(url, 'PNG', 0, 0, w, h, undefined, 'FAST');
      pdf.save('family-tree.pdf');
    };
    img.src = url;
  }

  nudgeBg(dx: number, dy: number) {
    this.bgOffsetX.update((x) => x + dx);
    this.bgOffsetY.update((y) => y + dy);
    this.scheduleExportRebuild();
  }

  resetBgOffset() {
    this.bgOffsetX.set(0);
    this.bgOffsetY.set(0);
    this.scheduleExportRebuild();
  }

  // Drag support
  private draggingBg = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private startOffsetX = 0;
  private startOffsetY = 0;

  beginBgDrag(ev: MouseEvent | TouchEvent) {
    this.draggingBg = true;
    const p = this.getPoint(ev);
    this.dragStartX = p.x;
    this.dragStartY = p.y;
    this.startOffsetX = this.bgOffsetX();
    this.startOffsetY = this.bgOffsetY();
  }

  moveBgDrag(ev: MouseEvent | TouchEvent) {
    if (!this.draggingBg) return;
    ev.preventDefault();
    const p = this.getPoint(ev);
    const dx = p.x - this.dragStartX;
    const dy = p.y - this.dragStartY;
    this.bgOffsetX.set(this.startOffsetX + Math.round(dx));
    this.bgOffsetY.set(this.startOffsetY + Math.round(dy));
    this.scheduleExportRebuild(50);
  }

  endBgDrag() {
    if (!this.draggingBg) return;
    this.draggingBg = false;
    this.scheduleExportRebuild();
  }

  private getPoint(ev: MouseEvent | TouchEvent) {
    if ((ev as TouchEvent).touches && (ev as TouchEvent).touches.length) {
      const t = (ev as TouchEvent).touches[0];
      return { x: t.clientX, y: t.clientY };
    }
    const m = ev as MouseEvent;
    return { x: m.clientX, y: m.clientY };
  }

  private scheduleExportRebuild(delay = 0) {
    if (!this.exportMode()) return;
    if (this.exportRebuildTimer) clearTimeout(this.exportRebuildTimer);
    this.exportRebuildTimer = setTimeout(() => {
      this.buildExportImage(true);
    }, delay);
  }

  private getBgAlpha(): number {
    const raw = Number(this.backgroundOpacity());
    if (!isFinite(raw)) return 1;
    const as01 = raw > 1 ? raw / 100 : raw;
    return Math.max(0, Math.min(1, as01));
  }

  private computeNodeLabel(m: FamilyMember): string {
    const fullName = [m.firstName, m.lastName].filter(Boolean).join(' ');
    if (!this.showBirthInfo()) return fullName;

    const yr = this.birthLabel(m);
    return yr ? `${fullName}\n${yr}` : fullName;
  }

  private refreshNodeLabels() {
    if (!this.cy) return;
    this.cy.nodes().forEach((node) => {
      const role = node.id();
      const m = this.members.find((mm) => mm.role === role);
      if (m) node.data('label', this.computeNodeLabel(m));
    });
    this.cy.style().update();
  }

  toggleBirthInfo() {
    const next = !this.showBirthInfo();
    this.showBirthInfo.set(next);
    localStorage.setItem('showBirthInfo', next ? '1' : '0');
    this.refreshNodeLabels();
  }

  private collectPartnerPairs(members: FamilyMember[]): [string, string][] {
    const pairs: [string, string][] = [];

    // core pairs
    const core: [Roles, Roles][] = [
      [Roles.FATHER, Roles.MOTHER],
      [Roles.PATERNAL_GRANDFATHER, Roles.PATERNAL_GRANDMOTHER],
      [Roles.MATERNAL_GRANDFATHER, Roles.MATERNAL_GRANDMOTHER],
    ];
    core.forEach(([a, b]) => {
      if (
        members.some((m) => m.role === a) &&
        members.some((m) => m.role === b)
      ) {
        pairs.push([a, b]);
      }
    });

    const byBase: Record<string, FamilyMember[]> = {};
    members.forEach((m) => {
      const idx = m.role.lastIndexOf('_');
      if (idx < 0) return;
      const base = m.role.slice(0, idx);
      (byBase[base] = byBase[base] || []).push(m);
    });
    Object.entries(byBase).forEach(([base, arr]) => {
      const f = arr.find((x) => x.role === `${base}_father`);
      const m = arr.find((x) => x.role === `${base}_mother`);
      if (f && m) pairs.push([f.role, m.role]);
    });

    const byId = new Map(members.map((m) => [m.id!, m]));
    const seen = new Set<string>();
    members.forEach((a) => {
      if (!a.partnerId) return;
      const b = byId.get(a.partnerId);
      if (!b) return;
      const key = [a.role, b.role].sort().join('::');
      if (seen.has(key)) return;
      seen.add(key);
      pairs.push([a.role, b.role]);
    });

    const uniq = new Map<string, [string, string]>();
    pairs.forEach(([a, b]) => uniq.set([a, b].sort().join('::'), [a, b]));
    return Array.from(uniq.values());
  }

  private enforcePartnerAdjacency(
    posMap: Map<string, { x: number; y: number }>,
    pairs: [string, string][],
    gap: number
  ): Map<string, string> {
    const mateOf = new Map<string, string>();
    const baseOf = (r: string) => {
      const i = r.lastIndexOf('_');
      return i >= 0 ? r.slice(0, i) : null;
    };

    pairs.forEach(([a, b]) => {
      const pa = posMap.get(a);
      const pb = posMap.get(b);
      if (!pa || !pb) return;

      const aF = /_father$/.test(a),
        aM = /_mother$/.test(a);
      const bF = /_father$/.test(b),
        bM = /_mother$/.test(b);
      const sameBase = baseOf(a) === baseOf(b);
      const isGeneratedParents = sameBase && ((aF && bM) || (aM && bF));

      // NEW: child + partner (e.g. owner_son + owner_son_partner)
      const isChildPartnerPair =
        (/_partner$/.test(a) && baseOf(a) === b) ||
        (/_partner$/.test(b) && baseOf(b) === a);

      const half = gap / 2;
      let y = (pa.y + pb.y) / 2;

      if (isGeneratedParents) {
        // ... (unchanged)
        const baseRole = baseOf(a)!;
        let mid = posMap.get(baseRole)?.x ?? (pa.x + pb.x) / 2;

        const fatherRole = aF ? a : b;
        const motherRole = aM ? a : b;
        const pf = posMap.get(fatherRole)!;
        const pm = posMap.get(motherRole)!;
        pf.x = mid - half;
        pf.y = y;
        pm.x = mid + half;
        pm.y = y;
        posMap.set(fatherRole, pf);
        posMap.set(motherRole, pm);
      } else if (isChildPartnerPair) {
        // Anchor at child's X and push partner outward (away from child's parent)
        const childRole = /_partner$/.test(a) ? b : a;
        const partnerRole = /_partner$/.test(a) ? a : b;

        const childPos = posMap.get(childRole)!;
        const parentRole = baseOf(childRole)!; // immediate parent of the child
        const parentPos = posMap.get(parentRole);

        const mid = childPos.x;
        const childOnLeft = parentPos
          ? parentPos.x < childPos.x
          : childPos.x <= posMap.get(partnerRole)!.x;

        const c = posMap.get(childRole)!;
        const p = posMap.get(partnerRole)!;
        c.x = childOnLeft ? mid - half : mid + half;
        c.y = y;
        p.x = childOnLeft ? mid + half : mid - half;
        p.y = y;

        posMap.set(childRole, c);
        posMap.set(partnerRole, p);
      } else {
        // ... (unchanged non-generated pair)
        const aIsLeft = pa.x <= pb.x;
        const leftRole = aIsLeft ? a : b;
        const rightRole = aIsLeft ? b : a;
        const mid = (pa.x + pb.x) / 2;

        const pl = posMap.get(leftRole)!;
        const pr = posMap.get(rightRole)!;
        pl.x = mid - half;
        pl.y = y;
        pr.x = mid + half;
        pr.y = y;
        posMap.set(leftRole, pl);
        posMap.set(rightRole, pr);
      }

      mateOf.set(a, b);
      mateOf.set(b, a);
    });

    return mateOf;
  }

  private resolveOverlapsXOnly(
    posMap: Map<string, { x: number; y: number }>,
    nodeSize: number,
    W: number,
    ownerX: number,
    mateOf?: Map<string, string>,
    pairGap?: number
  ) {
    const sideBuffer = nodeSize + 5;
    const minDist = nodeSize + 10;
    const maxIters = 20;
    const fixedRoles = new Set<string>([
      Roles.OWNER,
      Roles.MOTHER,
      Roles.FATHER,
      Roles.MATERNAL_GRANDMOTHER,
      Roles.MATERNAL_GRANDFATHER,
      Roles.PATERNAL_GRANDMOTHER,
      Roles.PATERNAL_GRANDFATHER,
    ]);

    const clampBySide = (role: string, p: { x: number; y: number }) => {
      if (role === Roles.OWNER) return p;
      if (role.startsWith('maternal_') || role === Roles.MOTHER) {
        p.x = Math.max(p.x, ownerX + sideBuffer);
      } else if (role.startsWith('paternal_') || role === Roles.FATHER) {
        p.x = Math.min(p.x, ownerX - sideBuffer);
      }
      p.x = Math.max(W * 0.05, Math.min(W * 0.95, p.x));
      return p;
    };

    const move = (role: string, dx: number) => {
      let p = posMap.get(role);
      if (!p) return;
      p.x += dx;
      p = clampBySide(role, p); // ← keep correct side
      posMap.set(role, p);

      const mate = mateOf?.get(role);
      if (mate) {
        let mp = posMap.get(mate);
        if (mp && Math.abs(mp.y - p.y) < nodeSize) {
          mp.x += dx;
          mp = clampBySide(mate, mp); // ← keep mate on correct side too
          posMap.set(mate, mp);
        }
      }
    };

    posMap.forEach((p, role) => {
      if (role === Roles.OWNER) return;
      if (role.startsWith('maternal_') || role === Roles.MOTHER) {
        p.x = Math.max(p.x, ownerX + sideBuffer);
      } else if (role.startsWith('paternal_') || role === Roles.FATHER) {
        p.x = Math.min(p.x, ownerX - sideBuffer);
      }
      p.x = Math.max(W * 0.05, Math.min(W * 0.95, p.x));
    });

    for (let iter = 0; iter < maxIters; iter++) {
      let moved = false;
      const entries = Array.from(posMap.entries());

      for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
          const [ri, pi] = entries[i];
          const [rj, pj] = entries[j];
          if (Math.abs(pi.y - pj.y) >= nodeSize) continue;

          const dx = pj.x - pi.x;
          const absDx = Math.abs(dx);
          if (absDx >= minDist) continue;

          const push = (minDist - absDx) / 2;
          const iFixed = fixedRoles.has(ri);
          const jFixed = fixedRoles.has(rj);

          if (iFixed && jFixed) continue;
          else if (iFixed) move(rj, dx > 0 ? +push * 2 : -push * 2);
          else if (jFixed) move(ri, dx > 0 ? -push * 2 : +push * 2);
          else {
            move(ri, dx > 0 ? -push : +push);
            move(rj, dx > 0 ? +push : -push);
          }

          if (mateOf && pairGap) {
            const recenterPair = (r: string) => {
              const mate = mateOf.get(r);
              if (!mate) return;

              let pr = posMap.get(r)!;
              let pm = posMap.get(mate)!;
              if (Math.abs(pr.y - pm.y) >= nodeSize) return;

              const mid = (pr.x + pm.x) / 2;

              // preserve who is already left vs right
              const rIsLeft = pr.x <= pm.x;
              const leftRole = rIsLeft ? r : mate;
              const rightRole = rIsLeft ? mate : r;

              let pl = posMap.get(leftRole)!;
              let prr = posMap.get(rightRole)!;

              pl.x = mid - pairGap / 2;
              prr.x = mid + pairGap / 2;

              // keep each on its correct side of the owner
              pl = clampBySide(leftRole, pl);
              prr = clampBySide(rightRole, prr);

              posMap.set(leftRole, pl);
              posMap.set(rightRole, prr);
            };

            recenterPair(ri);
            recenterPair(rj);
          }

          moved = true;
        }
      }

      if (!moved) break;
    }
  }

  private boostPosMap(
    posMap: Map<string, { x: number; y: number }>,
    anchorX: number,
    anchorY: number,
    sx: number,
    sy: number
  ) {
    posMap.forEach((p, key) => {
      p.x = anchorX + (p.x - anchorX) * sx;
      p.y = anchorY + (p.y - anchorY) * sy;
      posMap.set(key, p);
    });
  }

  /** Pack each horizontal row so items don't overlap while keeping
   *  parent-pairs centered above their child and everyone on the correct side.
   */
  private packRowsBySide(
    posMap: Map<string, { x: number; y: number }>,
    ownerX: number,
    W: number,
    nodeSize: number,
    pairGap: number
  ) {
    const epsY = nodeSize * 0.6; // same-row tolerance
    const minGap = nodeSize + 10; // minimal horizontal space between items
    const leftBound = W * 0.05;
    const rightBound = W * 0.95;
    const sideBuffer = nodeSize + 5;

    type Block = {
      roles: string[]; // one node OR two nodes (a parent pair)
      y: number; // row y (same for both roles if pair)
      center: number; // desired center (child x for pairs; node x for singles)
      width: number; // nodeSize or pairGap
    };

    // 1) collect rows (roughly equal y)
    const rows: { y: number; roles: string[] }[] = [];
    posMap.forEach((p, role) => {
      let row = rows.find((r) => Math.abs(r.y - p.y) <= epsY);
      if (!row) rows.push((row = { y: p.y, roles: [] }));
      row.roles.push(role);
    });

    // 2) for every row, split by side and build "blocks" (single or pair)
    const buildBlocks = (roles: string[]): Block[] => {
      const used = new Set<string>();
      const blocks: Block[] = [];
      for (const r of roles) {
        if (used.has(r)) continue;
        const p = posMap.get(r)!;
        const mate = this.lastMateOf.get(r);
        if (
          mate &&
          roles.includes(mate) &&
          Math.abs(posMap.get(mate)!.y - p.y) <= epsY
        ) {
          if (used.has(mate)) continue;
          used.add(r);
          used.add(mate);

          // order as currently left/right
          const leftRole = posMap.get(r)!.x <= posMap.get(mate)!.x ? r : mate;
          const rightRole = leftRole === r ? mate : r;

          // center = child's x if generated parents; else current midpoint
          const base = r.slice(0, r.lastIndexOf('_'));
          const child = posMap.get(base);
          const center = child
            ? child.x
            : (posMap.get(leftRole)!.x + posMap.get(rightRole)!.x) / 2;

          blocks.push({
            roles: [leftRole, rightRole],
            y: p.y,
            center,
            width: pairGap,
          });
        } else {
          used.add(r);
          blocks.push({
            roles: [r],
            y: p.y,
            center: p.x,
            width: nodeSize,
          });
        }
      }
      return blocks;
    };

    // Greedy, order-preserving "push" to remove overlaps within [minX,maxX]
    const packSide = (blocks: Block[], minX: number, maxX: number) => {
      if (blocks.length === 0) return;

      // sort by desired center (keeps parents over their child order)
      blocks.sort((a, b) => a.center - b.center);

      // left-to-right pass: push right so no overlaps
      let c = Math.max(minX + blocks[0].width / 2, blocks[0].center);
      const centers = new Array<number>(blocks.length);
      centers[0] = c;
      for (let i = 1; i < blocks.length; i++) {
        const need =
          centers[i - 1] + (blocks[i - 1].width + blocks[i].width) / 2 + minGap;
        centers[i] = Math.max(need, blocks[i].center);
      }

      // right-to-left pass: clamp to maxX without breaking order
      centers[blocks.length - 1] = Math.min(
        centers[blocks.length - 1],
        maxX - blocks[blocks.length - 1].width / 2
      );
      for (let i = blocks.length - 2; i >= 0; i--) {
        const allow =
          centers[i + 1] - (blocks[i + 1].width + blocks[i].width) / 2 - minGap;
        centers[i] = Math.min(centers[i], allow);
      }

      // apply centers back to nodes
      blocks.forEach((b, i) => {
        const cx = Math.max(
          minX + b.width / 2,
          Math.min(maxX - b.width / 2, centers[i])
        );
        if (b.roles.length === 2) {
          // parent pair
          const lx = cx - b.width / 2;
          const rx = cx + b.width / 2;
          const [l, r] = b.roles;
          const pl = posMap.get(l)!;
          const pr = posMap.get(r)!;
          pl.x = lx;
          pr.x = rx;
          posMap.set(l, pl);
          posMap.set(r, pr);
        } else {
          const r = b.roles[0];
          const p = posMap.get(r)!;
          p.x = cx;
          posMap.set(r, p);
        }
      });
    };

    rows.forEach((row) => {
      const leftRoles = row.roles.filter(
        (r) => r !== Roles.OWNER && posMap.get(r)!.x < ownerX
      );
      const rightRoles = row.roles.filter(
        (r) => r !== Roles.OWNER && posMap.get(r)!.x >= ownerX
      );

      const leftBlocks = buildBlocks(leftRoles);
      const rightBlocks = buildBlocks(rightRoles);

      // keep everyone on their side of the owner
      const leftMin = leftBound;
      const leftMax = ownerX - sideBuffer;
      const rightMin = ownerX + sideBuffer;
      const rightMax = rightBound;

      packSide(leftBlocks, leftMin, leftMax);
      packSide(rightBlocks, rightMin, rightMax);
    });
  }
}

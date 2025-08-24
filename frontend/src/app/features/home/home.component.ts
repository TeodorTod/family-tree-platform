import {
  Component,
  ElementRef,
  AfterViewInit,
  ViewChild,
  inject,
  signal,
  OnDestroy,
} from '@angular/core';
import cytoscape, { ElementDefinition } from 'cytoscape';
import { FamilyService } from '../../core/services/family.service';
import { FamilyMember } from '../../shared/models/family-member.model';
import { environment } from '../../environments/environment';
import { AddRelativeDialogComponent } from '../../shared/components/add-relative-dialog/add-relative-dialog.component';
import { Observable, switchMap } from 'rxjs';
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
export class HomeComponent implements AfterViewInit, OnDestroy {
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
    // 1) Determine view mode (query > saved > responsive default)
    const viewMode = this.route.snapshot.queryParamMap.get('view');
    const savedPref = localStorage.getItem('familyViewMode');
    const isSmallScreen = window.matchMedia('(max-width: 900px)').matches;

    if (viewMode === 'table' || viewMode === 'chart') {
      this.showTableView.set(viewMode === 'table');
    } else if (savedPref === 'table' || savedPref === 'chart') {
      this.showTableView.set(savedPref === 'table');
    } else {
      this.showTableView.set(isSmallScreen);
    }

    // 2) Persisted toggles / selections
    const savedBirth = localStorage.getItem('showBirthInfo');
    if (savedBirth !== null) this.showBirthInfo.set(savedBirth === '1');

    const savedBg = localStorage.getItem('selectedBackground');
    if (savedBg && this.backgroundImages.includes(savedBg)) {
      this.backgroundIndex.set(this.backgroundImages.indexOf(savedBg));
    } else {
      this.backgroundIndex.set(0);
    }

    // Ensure overlay is in sync
    this.backgroundOpacity.set(this.backgroundOpacityValue.toString());

    // Optionally respect saved circle size (if present), else compute responsive default
    const savedSizeRaw = localStorage.getItem('familyCircleSize');
    if (savedSizeRaw && !Number.isNaN(+savedSizeRaw)) {
      this.circleSizeValue = Math.max(40, Math.min(120, +savedSizeRaw));
      this.circleSize.set(this.circleSizeValue);
    } else {
      // 3) Initial sizing (run twice to catch container sizing after render)
      this.setInitialCircleSizeByWidth();
      requestAnimationFrame(() => this.setInitialCircleSizeByWidth());
    }

    // 4) Load family + render
    const isTableNow = this.showTableView();
    // ask for a slim payload if we’re rendering the chart (nodes + light edges)
    const requestOpts = isTableNow
      ? undefined
      : {
          fields: [
            'id',
            'role',
            'firstName',
            'lastName',
            'gender',
            'dob',
            'birthYear',
            'birthNote',
            'photoUrl',
            'partnerId',
            'partnerStatus',
          ] as (keyof FamilyMember)[],
          with: ['parentOf', 'childOf'] as const,
        };

    this.familyService.getMyFamily(requestOpts as any).subscribe((members) => {
      this.members = members as FamilyMember[];

      // Warn if duplicate roles (can collapse nodes)
      const seen = new Map<string, number>();
      const dups: string[] = [];
      for (const m of this.members) {
        const count = (seen.get(m.role) ?? 0) + 1;
        seen.set(m.role, count);
        if (count === 2) dups.push(m.role);
      }
      if (dups.length) {
        console.error(
          'Duplicate role strings found; graph may collapse nodes:',
          dups
        );
      }

      if (!this.showTableView()) {
        this.renderGraph(this.members);
        this.toggleEdgeVisibility();
        this.updateCircleSize(); // sync node sizes with current slider/saved value
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
    localStorage.setItem('familyPhotoUrl', photoUrl);
    this.customPhotoUrl = photoUrl;

    if (!this.cy) return;
    this.cy.nodes().forEach((node) => {
      node.data('photo', photoUrl);
      node.style('background-image', `url(${photoUrl})`);
    });
    this.cy.style().update();
    this.showPhotoPickerDialog.set(false);
  }

  private parseRole(role: string): {
    base: string;
    relationType: string;
    suffix: string;
  } {
    const parts = role.split('_');
    let suffix = '';
    if (parts.length > 1 && /^\d+$/.test(parts[parts.length - 1])) {
      suffix = parts.pop()!;
    }
    const relationType = parts.length > 0 ? parts[parts.length - 1] : '';
    const base = parts.slice(0, -1).join('_');
    return { base, relationType, suffix };
  }

  private renderGraph(members: FamilyMember[]) {
    const defaultPhoto = this.customPhotoUrl;
    const container = this.cyRef.nativeElement;
    const W = container.clientWidth;
    const H = container.clientHeight;
    const isMobile = W < 1400;

    const nodeSize = this.circleSize();
    const minSpacing = nodeSize + 10;
    const partnerSpacing = minSpacing;
    const shiftH = isMobile ? W * 0.1 : 100;

    let maternalGP = members
      .filter(
        (m) =>
          m.role === Roles.MATERNAL_GRANDMOTHER ||
          m.role === Roles.MATERNAL_GRANDFATHER
      )
      .sort((a, b) => a.role.localeCompare(b.role));
    let paternalGP = members
      .filter(
        (m) =>
          m.role === Roles.PATERNAL_GRANDMOTHER ||
          m.role === Roles.PATERNAL_GRANDFATHER
      )
      .sort((a, b) => a.role.localeCompare(b.role));
    let parents = members
      .filter((m) => m.role === Roles.MOTHER || m.role === Roles.FATHER)
      .sort((a, b) => a.role.localeCompare(b.role));
    const ownerArr = members.filter((m) => m.role === Roles.OWNER);

    const tierYs = {
      grandparents: H * 0.1,
      parents: isMobile ? H * 0.22 : H * 0.28,
      owner: isMobile ? H * 0.32 : H * 0.46,
    };

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

    const motherX = parentPosArr.find((p) => p.role === Roles.MOTHER)!.x;
    const fatherX = parentPosArr.find((p) => p.role === Roles.FATHER)!.x;
    const ownerPosArr = ownerArr.map((m) => ({
      role: m.role,
      x: (motherX + fatherX) / 2,
      y: tierYs.owner,
    }));

    const gpMin = Math.max(nodeSize * 1.4, 100);
    const gpMax = Math.max(nodeSize * 2.2, 180);
    const gpGap = isMobile
      ? Math.max(W * 0.12, gpMin)
      : Math.min(gpMax, Math.max(gpMin, Math.abs(fatherX - motherX) * 0.45));

    const makeGpPair = (parentX: number, arr: FamilyMember[]) => {
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

    const posMap = new Map<string, { x: number; y: number }>();
    parentPosArr.forEach((p) => posMap.set(p.role, { x: p.x, y: p.y }));
    ownerPosArr.forEach((p) => posMap.set(p.role, { x: p.x, y: p.y }));
    grandMatPos.forEach((p) => posMap.set(p.role, { x: p.x, y: p.y }));
    grandPatPos.forEach((p) => posMap.set(p.role, { x: p.x, y: p.y }));

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

    const byBase = dynamic.reduce((map, m) => {
      const { base } = this.parseRole(m.role);
      if (base) {
        (map[base] = map[base] || []).push(m);
      }
      return map;
    }, {} as Record<string, FamilyMember[]>);

    const remaining = { ...byBase };
    let didPlace: boolean;

    do {
      didPlace = false;

      for (const [baseRole, group] of Object.entries(remaining)) {
        const basePos = posMap.get(baseRole);
        if (!basePos) continue;

        const shiftVUp = tierYs.parents - tierYs.owner;
        const shiftVDown = tierYs.owner - tierYs.parents;

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

        let dynParents = group.filter((m) => {
          const { relationType } = this.parseRole(m.role);
          return relationType === 'mother' || relationType === 'father';
        });
        if (dynParents.length > 0) {
          let y: number;
          if (basePos.y === tierYs.owner) y = tierYs.parents;
          else if (basePos.y === tierYs.parents) y = tierYs.grandparents;
          else y = basePos.y - shiftVDown;

          const halfSpace = partnerSpacing / 2;

          const fatherM = dynParents.find(
            (m) => this.parseRole(m.role).relationType === 'father'
          );
          if (fatherM) {
            let x = basePos.x - halfSpace;
            if (isFatherSide) {
              x = Math.min(x, centerX - 20);
            } else if (isMotherSide) {
              x = Math.max(x, centerX + 20);
            }
            x = Math.max(W * 0.05, Math.min(W * 0.95, x));
            posMap.set(fatherM.role, { x, y });
          }

          const motherM = dynParents.find(
            (m) => this.parseRole(m.role).relationType === 'mother'
          );
          if (motherM) {
            let x = basePos.x + halfSpace;
            if (isFatherSide) {
              x = Math.min(x, centerX - 20);
            } else if (isMotherSide) {
              x = Math.max(x, centerX + 20);
            }
            x = Math.max(W * 0.05, Math.min(W * 0.95, x));
            posMap.set(motherM.role, { x, y });
          }
        }

        const sibs = group.filter((m) => {
          const { relationType } = this.parseRole(m.role);
          return relationType === 'brother' || relationType === 'sister';
        });
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

            if (isFatherSide) {
              x = Math.min(x, centerX - 20);
            } else if (isMotherSide) {
              x = Math.max(x, centerX + 20);
            }

            x = Math.max(W * 0.05, Math.min(W * 0.95, x));

            posMap.set(m.role, { x, y: basePos.y });
          });
        }

        group
          .filter((m) => this.parseRole(m.role).relationType === 'partner')
          .forEach((m, i) => {
            let x = basePos.x - shiftH * (i + 1);

            if (isFatherSide) {
              x = Math.min(x, centerX - 20);
            } else if (isMotherSide) {
              x = Math.max(x, centerX + 20);
            }

            x = Math.max(W * 0.05, Math.min(W * 0.95, x));

            posMap.set(m.role, {
              x,
              y: basePos.y,
            });
          });

        const kids = group.filter((m) => {
          const { relationType } = this.parseRole(m.role);
          return relationType === 'son' || relationType === 'daughter';
        });
        if (kids.length) {
          const totalW = (kids.length - 1) * shiftH;
          kids.forEach((m, i) => {
            let x = basePos.x - totalW / 2 + shiftH * i;
            const y = basePos.y + shiftVDown;

            if (isFatherSide) {
              x = Math.min(x, centerX - 20);
            } else if (isMotherSide) {
              x = Math.max(x, centerX + 20);
            }

            x = Math.max(W * 0.05, Math.min(W * 0.95, x));

            posMap.set(m.role, { x, y });
          });
        }

        delete remaining[baseRole];
        didPlace = true;
      }
    } while (didPlace && Object.keys(remaining).length);

    const elements: ElementDefinition[] = [];
    const ownerX = posMap.get(Roles.OWNER)!.x;
    const sideBuffer = nodeSize + 5;
    this.resolveOverlapsXOnly(posMap, nodeSize, W, ownerX);

    posMap.forEach((pos, role) => {
      if (role === Roles.OWNER) return;

      if (role.startsWith('maternal_') || role === Roles.MOTHER) {
        pos.x = Math.max(pos.x, ownerX + sideBuffer);
      } else if (role.startsWith('paternal_') || role === Roles.FATHER) {
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

    const fixedRoles = new Set(fixedKeys);
    const entries = Array.from(posMap.entries());

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [ra, pa] = entries[i];
        const [rb, pb] = entries[j];

        if (Math.abs(pa.y - pb.y) < nodeSize) {
          const dx = pb.x - pa.x;
          const absDx = Math.abs(dx);

          if (absDx < minSpacing) {
            const shift = (minSpacing - absDx) / 2;
            const isAFixed = fixedRoles.has(ra as Roles);
            const isBFixed = fixedRoles.has(rb as Roles);

            if (isAFixed && isBFixed) continue;
            else if (isAFixed) {
              if (dx > 0) pb.x += shift * 2;
              else pb.x -= shift * 2;
            } else if (isBFixed) {
              if (dx > 0) pa.x -= shift * 2;
              else pa.x += shift * 2;
            } else {
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

    members.forEach((m) => {
      const pos = posMap.get(m.role);
      if (!pos) return;

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

    dynamic.forEach((m) => {
      const { base, relationType, suffix } = this.parseRole(m.role);
      if (!base || !posMap.has(base)) return;

      if (relationType === 'mother' || relationType === 'father') {
        const childMembers = members.filter((cm) => {
          const cmParsed = this.parseRole(cm.role);
          return (
            cmParsed.base === base &&
            (cmParsed.relationType === 'son' ||
              cmParsed.relationType === 'daughter')
          );
        });

        childMembers.forEach((child) => {
          elements.push({
            data: { source: m.role, target: child.role },
          });
        });

        elements.push({
          data: { source: m.role, target: base },
        });

        const partnerRel = relationType === 'father' ? 'mother' : 'father';
        const partnerRole =
          `${base}_${partnerRel}` + (suffix ? `_${suffix}` : '');
        if (posMap.has(partnerRole)) {
          elements.push({
            data: {
              source: m.role,
              target: partnerRole,
              relationship: 'partner',
            },
          });
        }
      } else if (m.role.endsWith('_partner')) {
        elements.push({
          data: { source: base, target: m.role, relationship: 'partner' },
        });
      } else if (relationType === 'brother' || relationType === 'sister') {
        elements.push({
          data: { source: base, target: m.role, relationship: 'sibling' },
        });

        const possibleParents = [`${base}_mother`, `${base}_father`];
        possibleParents.forEach((parentRole) => {
          if (posMap.has(parentRole)) {
            elements.push({
              data: { source: parentRole, target: m.role },
            });
          }
        });
      } else if (relationType === 'son' || relationType === 'daughter') {
        elements.push({
          data: { source: base, target: m.role },
        });
      }
    });

    members
      .filter((m) => this.parseRole(m.role).relationType === 'partner')
      .forEach((m) => {
        const { base } = this.parseRole(m.role);
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

    members.forEach((m) => {
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

    this.cy.zoom(isMobile ? 0.7 : 0.9);
    this.cy.center();
    this.cy.panBy({ x: 0, y: container.clientHeight * 0.2 });
    this.cy.resize();
    this.cy.fit();

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
    if (m.dob) {
      const d = typeof m.dob === 'string' ? new Date(m.dob) : m.dob;
      const y =
        d instanceof Date && !isNaN(d.getTime()) ? d.getFullYear() : NaN;
      if (Number.isFinite(y)) return String(y);
    }
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

    const prefix = `${base.role}_${event.relation}`;
    const existing = this.members.filter(
      (m) => m.role === prefix || m.role.startsWith(`${prefix}_`)
    );

    let newRole: string;
    if (existing.length === 0) {
      newRole = prefix;
    } else {
      const suffixes = existing
        .map((m) => {
          if (m.role === prefix) return 1;
          const match = m.role.match(new RegExp(`${prefix}_(\\d+)$`));
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter((n) => Number.isFinite(n));

      const max = suffixes.length > 0 ? Math.max(...suffixes) : 1;
      newRole = `${prefix}_${max + 1}`;
    }

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
            this.members = members as any;
            this.renderGraph(members as FamilyMember[]);
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
    setTimeout(() => this.buildExportImage(true), 0);
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
    if (!bgImg) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, cw, ch);
      return;
    }

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
      const { base } = this.parseRole(m.role);
      if (base) {
        (byBase[base] = byBase[base] || []).push(m);
      }
    });
    Object.entries(byBase).forEach(([base, arr]) => {
      const f = arr.find(
        (x) => this.parseRole(x.role).relationType === 'father'
      );
      const m = arr.find(
        (x) => this.parseRole(x.role).relationType === 'mother'
      );
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
      const { base } = this.parseRole(r);
      return base;
    };

    pairs.forEach(([a, b]) => {
      const pa = posMap.get(a);
      const pb = posMap.get(b);
      if (!pa || !pb) return;

      const aParsed = this.parseRole(a);
      const bParsed = this.parseRole(b);
      const aF = aParsed.relationType === 'father';
      const aM = aParsed.relationType === 'mother';
      const bF = bParsed.relationType === 'father';
      const bM = bParsed.relationType === 'mother';
      const sameBase = baseOf(a) === baseOf(b);
      const isGeneratedParents = sameBase && ((aF && bM) || (aM && bF));

      const isChildPartnerPair =
        (aParsed.relationType === 'partner' && baseOf(a) === b) ||
        (bParsed.relationType === 'partner' && baseOf(b) === a);

      const half = gap / 2;
      let y = (pa.y + pb.y) / 2;

      if (isGeneratedParents) {
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
        const childRole = aParsed.relationType === 'partner' ? b : a;
        const partnerRole = aParsed.relationType === 'partner' ? a : b;

        const childPos = posMap.get(childRole)!;
        const parentRole = baseOf(childRole)!;
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
      p = clampBySide(role, p);
      posMap.set(role, p);

      const mate = mateOf?.get(role);
      if (mate) {
        let mp = posMap.get(mate);
        if (mp && Math.abs(mp.y - p.y) < nodeSize) {
          mp.x += dx;
          mp = clampBySide(mate, mp);
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

              const rIsLeft = pr.x <= pm.x;
              const leftRole = rIsLeft ? r : mate;
              const rightRole = rIsLeft ? mate : r;

              let pl = posMap.get(leftRole)!;
              let prr = posMap.get(rightRole)!;

              pl.x = mid - pairGap / 2;
              prr.x = mid + pairGap / 2;

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

  private packRowsBySide(
    posMap: Map<string, { x: number; y: number }>,
    ownerX: number,
    W: number,
    nodeSize: number,
    pairGap: number
  ) {
    const epsY = nodeSize * 0.6;
    const minGap = nodeSize + 10;
    const leftBound = W * 0.05;
    const rightBound = W * 0.95;
    const sideBuffer = nodeSize + 5;

    type Block = {
      roles: string[];
      y: number;
      center: number;
      width: number;
    };

    const rows: { y: number; roles: string[] }[] = [];
    posMap.forEach((p, role) => {
      let row = rows.find((r) => Math.abs(r.y - p.y) <= epsY);
      if (!row) rows.push((row = { y: p.y, roles: [] }));
      row.roles.push(role);
    });

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

          const leftRole = posMap.get(r)!.x <= posMap.get(mate)!.x ? r : mate;
          const rightRole = leftRole === r ? mate : r;

          const base = this.parseRole(r).base;
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

    const packSide = (blocks: Block[], minX: number, maxX: number) => {
      if (blocks.length === 0) return;

      blocks.sort((a, b) => a.center - b.center);

      let c = Math.max(minX + blocks[0].width / 2, blocks[0].center);
      const centers = new Array<number>(blocks.length);
      centers[0] = c;
      for (let i = 1; i < blocks.length; i++) {
        const need =
          centers[i - 1] + (blocks[i - 1].width + blocks[i].width) / 2 + minGap;
        centers[i] = Math.max(need, blocks[i].center);
      }

      centers[blocks.length - 1] = Math.min(
        centers[blocks.length - 1],
        maxX - blocks[blocks.length - 1].width / 2
      );
      for (let i = blocks.length - 2; i >= 0; i--) {
        const allow =
          centers[i + 1] - (blocks[i + 1].width + blocks[i].width) / 2 - minGap;
        centers[i] = Math.min(centers[i], allow);
      }

      blocks.forEach((b, i) => {
        const cx = Math.max(
          minX + b.width / 2,
          Math.min(maxX - b.width / 2, centers[i])
        );
        if (b.roles.length === 2) {
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

      const leftMin = leftBound;
      const leftMax = ownerX - sideBuffer;
      const rightMin = ownerX + sideBuffer;
      const rightMax = rightBound;

      packSide(leftBlocks, leftMin, leftMax);
      packSide(rightBlocks, rightMin, rightMax);
    });
  }

  ngOnDestroy() {
    if (this.exportRebuildTimer) clearTimeout(this.exportRebuildTimer);
    if (this.cy) {
      this.cy.destroy();
      this.cy = undefined;
    }
  }
}

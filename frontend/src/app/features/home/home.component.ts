import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import cytoscape from 'cytoscape';
import { FamilyService } from '../../core/services/family.service';
import { FamilyMember } from '../../shared/models/family-member.model';
import { environment } from '../../../environments/environment';
import { AddRelativeDialogComponent } from '../../shared/components/add-relative-dialog/add-relative-dialog.component';
import { Observable, switchMap } from 'rxjs';
import { SharingApiService } from '../../core/services/sharing-api.service';
import { SHARED_ANGULAR_IMPORTS } from '../../shared/imports/shared-angular-imports';
import { ActivatedRoute, Router } from '@angular/router';
import { CONSTANTS } from '../../shared/constants/constants';
import { Roles } from '../../shared/enums/roles.enum';
import { PhotoPickerDialogComponent } from './components/photo-picker-dialog/photo-picker-dialog.component';
import { BackgroundPickerDialogComponent } from './components/background-picker-dialog/background-picker-dialog.component';
import { BACKGROUND_IMAGES } from '../../shared/constants/background-images';
import { TreeTableComponent } from './components/tree-table/tree-table.component';
import { PartnerStatus } from '../../shared/enums/partner-status.enum';
import { AmbientSoundService } from './services/ambient-sound.service';
import { PlatformStorageService } from '../../core/services/platform-storage.service';
import { HomeControlPanelComponent } from './components/home-control-panel/home-control-panel.component';
import { ExportOverlayComponent } from './components/export-overlay/export-overlay.component';
import { NodeHoverActionsComponent } from './components/node-hover-actions/node-hover-actions.component';
import { FamilyGraphExportService } from './services/family-graph-export.service';
import { FamilyMembersStore } from './family-members.store';
import { computeFamilyGraphLayout } from './graph/family-graph-layout';
import { buildFamilyGraphElements } from './graph/family-graph-elements';
import { getFamilyGraphStylesheet } from './graph/family-graph-cytoscape-style';
import { computeNodeLabel } from './graph/family-graph-labels';

@Component({
  selector: 'app-home',
  imports: [
    AddRelativeDialogComponent,
    PhotoPickerDialogComponent,
    BackgroundPickerDialogComponent,
    HomeControlPanelComponent,
    ExportOverlayComponent,
    NodeHoverActionsComponent,
    TreeTableComponent,
    ...SHARED_ANGULAR_IMPORTS,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  CONSTANTS = CONSTANTS;
  @ViewChild('cy', { static: true }) cyRef!: ElementRef<HTMLElement>;
  hoveredNode = signal<{ id: string; x: number; y: number } | null>(null);
  private familyService = inject(FamilyService);
  private route = inject(ActivatedRoute);
  private sharingApi = inject(SharingApiService);
  router = inject(Router);
  private ambientSound = inject(AmbientSoundService);
  private platformStorage = inject(PlatformStorageService);
  private exportService = inject(FamilyGraphExportService);
  private familyMembersStore = inject(FamilyMembersStore);
  private readonly soundSessionKey = 'ambientSoundPlayedSession';
  cy?: cytoscape.Core;

  selectedMember = signal<FamilyMember | null>(null);
  showAddDialog = signal(false);
  readonly members = this.familyMembersStore.members;
  showConnections = signal(false);
  backgroundIndex = signal(0);
  backgroundOpacityValue = 0.6;
  backgroundOpacity = signal(this.backgroundOpacityValue.toString());
  showPhotoPickerDialog = signal(false);
  showBackgroundDialog = signal(false);
  showTableView = signal(false);
  circleSizeValue = 80;
  circleSize = signal(this.circleSizeValue);
  textSizeValue = 14;
  textSize = signal(this.textSizeValue);
  exportMode = signal(false);
  exportDataUrl = signal<string | null>(null);
  exportTight = signal(false);
  exportPaddingPx = signal(64);
  bgOffsetX = signal(0);
  bgOffsetY = signal(0);
  exportMeta = signal<{ width: number; height: number } | null>(null);
  exportBuilding = signal(false);
  showBirthInfo = signal<boolean>(true);
  soundConsent = signal(false);
  readonly soundPlaying = this.ambientSound.playing;
  private exportRebuildTimer: ReturnType<typeof setTimeout> | null = null;
  private distanceBoostX = 1.6;
  private distanceBoostY = 1.0;
  private readonly textSizeMin = 8;
  private readonly textSizeMax = 24;

  customPhotoUrl =
    this.platformStorage.getItem('familyPhotoUrl') ??
    'assets/images/user-image/user.svg';

  ngAfterViewInit(): void {
    // 1) Determine view mode: query > route segment > responsive default
    const viewMode = this.route.snapshot.queryParamMap.get('view');
    const segment = this.route.snapshot.url[0]?.path;
    const isSmallScreen = this.platformStorage.matchMedia(
      '(max-width: 900px)'
    );

    if (viewMode === 'table' || viewMode === 'chart') {
      this.showTableView.set(viewMode === 'table');
    } else if (segment === 'table' || segment === 'chart') {
      this.showTableView.set(segment === 'table');
    } else {
      this.showTableView.set(isSmallScreen);
    }

    // Ensure overlay is in sync
    this.backgroundOpacity.set(this.backgroundOpacityValue.toString());

    this.hydratePersistedPreferencesFromBrowser();

    // 4) Load family + render
    const isTableNow = this.showTableView();
    // ask for a slim payload if we’re rendering the chart (nodes + light edges)
    const requestOpts = isTableNow
      ? ({ with: ['profile'] as const } as const)
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
          'dod',
          'deathYear',
          'deathNote',
          'isAlive',
          'photoUrl',
          'partnerId',
          'partnerStatus',
        ] as (keyof FamilyMember)[],
        with: ['parentOf', 'childOf'] as const,
      };

    this.familyService.getMyFamily(requestOpts as any).subscribe((members) => {
      const next = members as FamilyMember[];
      this.familyMembersStore.setMembers(next);

      // Warn if duplicate roles (can collapse nodes)
      const seen = new Map<string, number>();
      const dups: string[] = [];
      for (const m of next) {
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
        this.renderGraph(next);
        this.toggleEdgeVisibility();
        this.updateCircleSize(); // sync node sizes with current slider/saved value
      }
    });
  }

  private setInitialCircleSizeByWidth(): void {
    if (!this.platformStorage.isBrowserEnvironment()) {
      return;
    }
    setTimeout(() => {
      const w = Math.max(
        window.innerWidth || 0,
        this.cyRef?.nativeElement?.clientWidth || 0
      );
      const next = w <= 1024 ? 30 : 80;

      if (this.circleSizeValue === next) return;

      this.circleSizeValue = next;
      this.circleSize.set(next);
      this.platformStorage.setItem('familyCircleSize', String(next));

      if (this.cy) this.updateCircleSize();
    }, 0);
  }

  private setInitialTextSizeByWidth(): void {
    if (!this.platformStorage.isBrowserEnvironment()) {
      return;
    }
    setTimeout(() => {
      const w = Math.max(
        window.innerWidth || 0,
        this.cyRef?.nativeElement?.clientWidth || 0
      );
      const next = w <= 1024 ? 11 : 14;

      if (this.textSizeValue === next) return;

      this.textSizeValue = next;
      this.textSize.set(next);
      this.platformStorage.setItem('familyTextSize', String(next));

      if (this.cy) this.updateTextSize();
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
    this.platformStorage.setItem('familyPhotoUrl', photoUrl);
    this.customPhotoUrl = photoUrl;

    if (!this.cy) return;
    this.cy.nodes().forEach((node) => {
      node.data('photo', photoUrl);
      node.style('background-image', `url(${photoUrl})`);
    });
    this.cy.style().update();
    this.showPhotoPickerDialog.set(false);
  }
  private renderGraph(members: FamilyMember[]) {
    const defaultPhoto = this.customPhotoUrl;
    const container = this.cyRef.nativeElement;
    const W = container.clientWidth;
    const H = container.clientHeight;

    const layout = computeFamilyGraphLayout({
      members,
      W,
      H,
      circleSize: this.circleSize(),
      textSize: this.textSize(),
      showBirthInfo: this.showBirthInfo(),
      distanceBoostX: this.distanceBoostX,
      distanceBoostY: this.distanceBoostY,
    });

    const elements = buildFamilyGraphElements({
      members,
      layout,
      defaultPhoto,
      apiUrl: environment.apiUrl,
      showBirthInfo: this.showBirthInfo(),
    });

    const isMobile = layout.isMobile;

    this.cy = cytoscape({
      container,
      elements,
      layout: { name: 'preset', fit: true, padding: 20, animate: true },
      style: getFamilyGraphStylesheet({
        circleSize: this.circleSize(),
        textSize: this.textSize(),
        labelMaxWidth: layout.labelMaxWidth,
      }),
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

  handleAddRelative(event: {
    member?: Partial<FamilyMember>;
    relation: string;
    clonedMemberId?: string;
    approvedRequestId?: string;
  }) {
    const base = this.selectedMember();
    if (!base) return;

    const ensureCloned = (cb: (id: string) => void) => {
      if (event.clonedMemberId) return cb(event.clonedMemberId);
      if (event.approvedRequestId) {
        this.sharingApi
          .cloneApprovedRequest(event.approvedRequestId)
          .subscribe(({ newMemberId }) => cb(newMemberId));
        return;
      }
      cb('');
    };

    if (event.clonedMemberId || event.approvedRequestId) {
      const relationshipType =
        event.relation === 'partner'
          ? 'partner'
          : event.relation === 'brother' || event.relation === 'sister'
          ? 'sibling'
          : 'parent';

      ensureCloned((newId) => {
        if (!newId) return; // safety
        const prefix = `${base.role}_${event.relation}`;
        const existing = this.members().filter(
          (m) => m.role === prefix || m.role.startsWith(`${prefix}_`)
        );
        let newRole = prefix;
        if (existing.length > 0) {
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

        const proceed = () =>
          this.familyService
            .assignRole(newId, newRole)
            .subscribe(() => {
              this.familyService
                .createRelationship({
                  fromMemberId: base.id!,
                  toMemberId: newId,
                  type: relationshipType,
                })
                .subscribe(() => {
                  if (event.relation === 'partner') {
                    this.familyService
                      .setPartner(base.id!, newId, PartnerStatus.UNKNOWN)
                      .subscribe(() => {
                        this.showAddDialog.set(false);
                        this.selectedMember.set(null);
                        this.familyService.getMyFamily().subscribe((members) => {
                          this.familyMembersStore.setMembers(members as FamilyMember[]);
                          this.renderGraph(members as FamilyMember[]);
                        });
                      });
                  } else {
                    this.showAddDialog.set(false);
                    this.selectedMember.set(null);
                    this.familyService.getMyFamily().subscribe((members) => {
                      this.familyMembersStore.setMembers(members as FamilyMember[]);
                      this.renderGraph(members as FamilyMember[]);
                    });
                  }
                });
            });

        if (event.member) {
          this.familyService
            .getFamilyMemberById(newId)
            .subscribe((m: any) => {
              if (m?.role) {
                this.familyService
                  .updateMemberByRole(m.role, event.member!)
                  .subscribe(() => proceed());
              } else {
                proceed();
              }
            });
        } else {
          proceed();
        }
      });
      return;
    }

    const prefix = `${base.role}_${event.relation}`;
    const existing = this.members().filter(
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
      ...(event.member as any),
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
            this.familyMembersStore.setMembers(members as FamilyMember[]);
            this.renderGraph(members as FamilyMember[]);
          });
        },
        error: (err) => {
          console.error('Failed to add relative:', err);
        },
      });
  }

  openAddDialog(role: string | undefined | null) {
    const currentMembers = this.members();
    if (!role || currentMembers.length === 0) return;
    const member = currentMembers.find((m) => m.role === role);
    if (member) {
      this.selectedMember.set(member);
      this.showAddDialog.set(true);
    }
    this.hoveredNode.set(null);
  }

  editMember() {
    const hovered = this.hoveredNode();
    if (!hovered) return;

    const member = this.members().find((m) => m.role === hovered.id);
    if (member) {
      this.router.navigate([CONSTANTS.ROUTES.MEMBER, member.role], {
        queryParams: { view: this.showTableView() ? 'table' : 'chart' },
      });
    }
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

    this.router.navigate([isTable ? 'table' : 'chart'], {
      relativeTo: this.route.parent,
      queryParams: { view: isTable ? 'table' : 'chart' },
      queryParamsHandling: 'merge',
    });

    if (!isTable) {
      setTimeout(() => {
        if (!this.cy) {
          this.renderGraph(this.members());
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
    this.platformStorage.setItem(
      'familyCircleSize',
      this.circleSizeValue.toString()
    );

    if (!this.cy) return;

    this.cy.nodes().forEach((node) => {
      node.style({
        width: `${this.circleSizeValue}px`,
        height: `${this.circleSizeValue}px`,
        'font-size': `${this.textSizeValue}px`,
        'text-max-width': `${
          this.circleSizeValue * (this.showBirthInfo() ? 2.4 : 1.6)
        }px`,
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

  updateTextSize() {
    const clamped = this.clamp(
      this.textSizeValue,
      this.textSizeMin,
      this.textSizeMax
    );
    this.textSizeValue = clamped;
    this.textSize.set(clamped);
    this.platformStorage.setItem('familyTextSize', clamped.toString());

    if (!this.cy) return;

    this.cy.nodes().forEach((node) => {
      node.style({ 'font-size': `${clamped}px` });
    });

    this.cy.style().update();
  }

  openExportView(tight = false) {
    this.exportTight.set(tight);
    this.exportMode.set(true);
    document.body.classList.add('export-mode');
    this.exportBuilding.set(false);
    this.exportMeta.set(null);
    this.resetBgOffset(true);
    setTimeout(() => this.buildExportImage(true), 0);
  }

  closeExportView() {
    this.exportMode.set(false);
    this.exportDataUrl.set(null);
    this.exportBuilding.set(false);
    this.exportMeta.set(null);
    document.body.classList.remove('export-mode');
    this.resetBgOffset(true);
  }

  private async buildExportImage(asSeen = true) {
    if (!this.cy) return;
    this.exportBuilding.set(true);
    this.exportMeta.set(null);

    try {
      const result = await this.exportService.buildExportImage({
        cy: this.cy,
        asSeen,
        exportTight: this.exportTight(),
        exportPaddingPx: this.exportPaddingPx(),
        backgroundUrl: this.backgroundUrl(),
        bgOffsetX: this.bgOffsetX(),
        bgOffsetY: this.bgOffsetY(),
        backgroundOpacity: this.backgroundOpacity(),
      });
      if (result) {
        this.exportDataUrl.set(result.dataUrl);
        this.exportMeta.set(result.meta);
      }
    } catch (err) {
      console.error('Failed to build export image', err);
    } finally {
      this.exportBuilding.set(false);
    }
  }

  onExportNudge(ev: { dx: number; dy: number }): void {
    this.nudgeBg(ev.dx, ev.dy);
  }

  onDownloadPng(): void {
    const url = this.exportDataUrl();
    if (url) this.exportService.downloadPng(url);
  }

  onDownloadPdf(): void {
    const url = this.exportDataUrl();
    if (url) this.exportService.downloadPdf(url);
  }

  nudgeBg(dx: number, dy: number) {
    this.bgOffsetX.update((x) => x + dx);
    this.bgOffsetY.update((y) => y + dy);
    this.scheduleExportRebuild();
  }

  resetBgOffset(skipRebuild = false) {
    this.bgOffsetX.set(0);
    this.bgOffsetY.set(0);
    if (!skipRebuild) this.scheduleExportRebuild();
  }

  refreshExportPreview() {
    this.buildExportImage(true);
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

  private clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  private refreshNodeLabels() {
    if (!this.cy) return;
    this.cy.nodes().forEach((node) => {
      const role = node.id();
      const m = this.members().find((mm) => mm.role === role);
      if (m)
        node.data('label', computeNodeLabel(m, this.showBirthInfo()));
    });
    this.cy.style().update();
  }

  toggleBirthInfo() {
    const next = !this.showBirthInfo();
    this.showBirthInfo.set(next);
    this.platformStorage.setItem('showBirthInfo', next ? '1' : '0');
    this.refreshNodeLabels();
  }

  private hydratePersistedPreferencesFromBrowser() {
    if (!this.platformStorage.isBrowserEnvironment()) {
      return;
    }

    const birth = this.platformStorage.getItemFromStorage('showBirthInfo');
    if (birth !== null) {
      this.showBirthInfo.set(birth === '1');
    }

    const savedBg = this.platformStorage.getItemFromStorage(
      'selectedBackground'
    );
    if (savedBg && this.backgroundImages.includes(savedBg)) {
      this.backgroundIndex.set(this.backgroundImages.indexOf(savedBg));
    } else {
      this.backgroundIndex.set(0);
    }

    let circlePreferenceApplied = false;
    const savedSizeRaw = this.platformStorage.getItemFromStorage(
      'familyCircleSize'
    );
    if (savedSizeRaw && !Number.isNaN(+savedSizeRaw)) {
      const next = Math.max(40, Math.min(120, +savedSizeRaw));
      this.circleSizeValue = next;
      this.circleSize.set(next);
      circlePreferenceApplied = true;
    }
    if (!circlePreferenceApplied) {
      this.setInitialCircleSizeByWidth();
      if (this.platformStorage.isBrowserEnvironment()) {
        requestAnimationFrame(() => this.setInitialCircleSizeByWidth());
      }
    }

    let textPreferenceApplied = false;
    const savedTextRaw = this.platformStorage.getItemFromStorage(
      'familyTextSize'
    );
    if (savedTextRaw && !Number.isNaN(+savedTextRaw)) {
      const next = this.clamp(+savedTextRaw, this.textSizeMin, this.textSizeMax);
      this.textSizeValue = next;
      this.textSize.set(next);
      textPreferenceApplied = true;
    }
    if (!textPreferenceApplied) {
      this.setInitialTextSizeByWidth();
      if (this.platformStorage.isBrowserEnvironment()) {
        requestAnimationFrame(() => this.setInitialTextSizeByWidth());
      }
    }

    const savedPhoto = this.platformStorage.getItemFromStorage(
      'familyPhotoUrl'
    );
    if (savedPhoto) {
      this.customPhotoUrl = savedPhoto;
    }

    const soundConsent = this.platformStorage.getItemFromStorage(
      'ambientSoundConsent'
    );
    if (soundConsent === '1') {
      this.soundConsent.set(true);
      const playedThisSession = this.platformStorage.getSessionItem(
        this.soundSessionKey
      );
      if (playedThisSession !== '1') {
        this.platformStorage.setSessionItem(this.soundSessionKey, '1');
        this.ambientSound.play();
      }
    }
  }

  toggleAmbientSound() {
    if (!this.soundConsent()) {
      this.enableAmbientSound();
      return;
    }
    this.ambientSound.toggle();
  }

  private enableAmbientSound() {
    if (this.soundConsent()) {
      return;
    }
    this.soundConsent.set(true);
    this.platformStorage.setItem('ambientSoundConsent', '1');
    this.platformStorage.setSessionItem(this.soundSessionKey, '1');
    this.ambientSound.play(true);
  }

  ngOnDestroy() {
    if (this.exportRebuildTimer) clearTimeout(this.exportRebuildTimer);
    if (this.cy) {
      this.cy.destroy();
      this.cy = undefined;
    }
    this.ambientSound.cleanup();
  }
}


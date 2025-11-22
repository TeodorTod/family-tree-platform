import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { SHARED_ANGULAR_IMPORTS } from '../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../shared/imports/shared-primeng-imports';
import { SharingApiService } from '../../core/services/sharing-api.service';
import { SharingNotificationsService } from '../../core/services/sharing-notifications.service';
import { CONSTANTS } from '../../shared/constants/constants';
import { AddRelativeDialogComponent } from '../../shared/components/add-relative-dialog/add-relative-dialog.component';
import { FamilyService } from '../../core/services/family.service';
import { PartnerStatus } from '../../shared/enums/partner-status.enum';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-sharing-requests-page',
  standalone: true,
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS, AddRelativeDialogComponent],
  templateUrl: './sharing-requests.page.html',
  styleUrls: ['./sharing-requests.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SharingRequestsPage implements OnInit {
  CONSTANTS = CONSTANTS;
  private api = inject(SharingApiService);
  private family = inject(FamilyService);
  private notifications = inject(SharingNotificationsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  activeTab = signal<'incoming' | 'outgoing'>('incoming');
  incoming = signal<any[]>([]);
  outgoing = signal<any[]>([]);

  showAddDialog = signal(false);
  baseOwner: any = null;
  clonedMemberId: string | null = null;

  ngOnInit(): void {
    this.listenForTabChanges();
    this.refresh();
  }

  refresh() {
    this.api.getIncomingRequests().subscribe((d) => this.incoming.set(d));
    this.api.getOutgoingRequests().subscribe((d) => this.outgoing.set(d));
    this.notifications.refresh();
  }

  onTabChange(value: 'incoming' | 'outgoing' | string | number) {
    const nextTab: 'incoming' | 'outgoing' = value === 'outgoing' ? 'outgoing' : 'incoming';
    this.activeTab.set(nextTab);
    this.notifications.markTabViewed(nextTab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: nextTab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  decide(id: string, status: 'APPROVED' | 'REJECTED') {
    this.api.decideRequest(id, status).subscribe(() => {
      this.refresh();
      this.notifications.refresh();
    });
  }

  importApproved(row: any) {
    this.family.getFamilyMemberByRole('owner').subscribe((owner) => {
      this.baseOwner = owner;
      this.family.getMyFamily().subscribe((members) => {
        const match = (members as any[]).find((m) => (m as any).copiedFromMemberId === row.targetMemberId);
        if (match) {
          this.clonedMemberId = match.id;
          this.showAddDialog.set(true);
        }
      });
    });
  }

  handleDialogSaved(event: { relation: string; clonedMemberId?: string; approvedRequestId?: string; member?: any }) {
    if (!this.baseOwner || (!event?.clonedMemberId && !event?.approvedRequestId)) {
      this.showAddDialog.set(false);
      this.clonedMemberId = null;
      return;
    }

    const relationshipType =
      event.relation === 'partner'
        ? 'partner'
        : event.relation === 'brother' || event.relation === 'sister'
        ? 'sibling'
        : 'parent';

    const updateThen = (newId: string) => this.family.getMyFamily().subscribe((members: any[]) => {
      const prefix = `${this.baseOwner.role}_${event.relation}`;
      const existing = (members || []).filter((m) => m.role === prefix || m.role?.startsWith(`${prefix}_`));
      let newRole = prefix;
      if (existing.length > 0) {
        const suffixes = existing
          .map((m) => {
            if (m.role === prefix) return 1;
            const match = String(m.role).match(new RegExp(`${prefix}_(\\\d+)$`));
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter((x) => Number.isFinite(x));
        const max = suffixes.length > 0 ? Math.max(...suffixes) : 1;
        newRole = `${prefix}_${max + 1}`;
      }
      this.family.assignRole(newId, newRole).subscribe(() => {
        this.family
          .createRelationship({
            fromMemberId: this.baseOwner.id,
            toMemberId: newId,
            type: relationshipType,
          })
          .subscribe(() => {
            if (event.relation === 'partner') {
              this.family
                .setPartner(this.baseOwner.id, newId, PartnerStatus.UNKNOWN)
                .subscribe(() => {
                  this.showAddDialog.set(false);
                  this.clonedMemberId = null;
                });
            } else {
              this.showAddDialog.set(false);
              this.clonedMemberId = null;
            }
          });
      });
    });

    const ensureCloned = (cb: (id: string) => void) => {
      if (event.clonedMemberId) return cb(event.clonedMemberId);
      this.api.cloneApprovedRequest(event.approvedRequestId!).subscribe(({ newMemberId }) => cb(newMemberId));
    };

    ensureCloned((newId) => {
      if (event.member) {
        this.family.getFamilyMemberById(newId).subscribe((m: any) => {
          if (m?.role) {
            this.family.updateMemberByRole(m.role, event.member).subscribe(() => updateThen(newId));
          } else {
            updateThen(newId);
          }
        });
      } else {
        updateThen(newId);
      }
    });
  }

  private listenForTabChanges() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const tabParam = params.get('tab');
        const nextTab: 'incoming' | 'outgoing' = tabParam === 'outgoing' ? 'outgoing' : 'incoming';
        this.activeTab.set(nextTab);
        this.notifications.markTabViewed(nextTab);
      });
  }
}

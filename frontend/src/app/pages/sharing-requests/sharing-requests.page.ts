import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { SHARED_ANGULAR_IMPORTS } from '../../shared/imports/shared-angular-imports';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SharingApiService } from '../../core/services/sharing-api.service';
import { SharingNotificationsService } from '../../core/services/sharing-notifications.service';
import { CONSTANTS } from '../../shared/constants/constants';
import { AddRelativeDialogComponent } from '../../shared/components/add-relative-dialog/add-relative-dialog.component';
import { FamilyService } from '../../core/services/family.service';
import { PartnerStatus } from '../../shared/enums/partner-status.enum';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ShareRequestStatus } from '../../shared/enums/share-request-status.enum';
import { ShareRequestTab } from '../../shared/enums/share-request-tab.enum';
import { ConfirmationService } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';
import { FamilyMember } from '../../shared/models/family-member.model';
import { SanitizedShareRequestDto } from '../../core/services/sharing-dto-sanitizer.service';

@Component({
  selector: 'app-sharing-requests-page',
  imports: [
    ...SHARED_ANGULAR_IMPORTS,
    TabsModule,
    TableModule,
    TagModule,
    TooltipModule,
    ButtonModule,
    ConfirmDialog,
    AddRelativeDialogComponent,
  ],
  templateUrl: './sharing-requests.page.html',
  styleUrls: ['./sharing-requests.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SharingRequestsPage implements OnInit {
  CONSTANTS = CONSTANTS;
  ShareRequestStatusEnum = ShareRequestStatus;
  ShareRequestTabEnum = ShareRequestTab;
  private api = inject(SharingApiService);
  private family = inject(FamilyService);
  private notifications = inject(SharingNotificationsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private confirmation = inject(ConfirmationService);
  private translate = inject(TranslateService);
  statusLabelKey: Record<ShareRequestStatus, string> = {
    [ShareRequestStatus.Pending]: CONSTANTS.SHARING_STATUS_PENDING,
    [ShareRequestStatus.Approved]: CONSTANTS.SHARING_STATUS_APPROVED,
    [ShareRequestStatus.Rejected]: CONSTANTS.SHARING_STATUS_REJECTED,
  };

  statusSeverity(status?: ShareRequestStatus | string | null) {
    if (status === ShareRequestStatus.Approved) {
      return 'success';
    }
    if (status === ShareRequestStatus.Rejected) {
      return 'danger';
    }
    return 'info';
  }

  truncateMessage(message?: string | null) {
    const value = (message ?? '').trim();
    if (value.length <= 20) {
      return value || '-';
    }
    return `${value.slice(0, 20)}...`;
  }

  statusLabelKeyFor(status?: ShareRequestStatus | string | null) {
    if (!status) {
      return '';
    }
    const key = status as ShareRequestStatus;
    return this.statusLabelKey[key] ?? status;
  }

  activeTab = signal<ShareRequestTab>(ShareRequestTab.Incoming);
  incoming = signal<SanitizedShareRequestDto[]>([]);
  outgoing = signal<SanitizedShareRequestDto[]>([]);

  showAddDialog = signal(false);
  baseOwner: (Partial<FamilyMember> & { id: string; role: string }) | null = null;
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

  onTabChange(value: ShareRequestTab | string | number | undefined) {
    const nextTab = this.toTab(value);
    this.activeTab.set(nextTab);
    this.notifications.markTabViewed(nextTab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: nextTab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  decide(id: string, status: ShareRequestStatus.Approved | ShareRequestStatus.Rejected) {
    this.api.decideRequest(id, status).subscribe(() => {
      this.refresh();
      this.notifications.refresh();
    });
  }

  confirmDecision(
    row: SanitizedShareRequestDto,
    status: ShareRequestStatus.Approved | ShareRequestStatus.Rejected,
  ) {
    const isApprove = status === ShareRequestStatus.Approved;
    const headerKey = isApprove ? CONSTANTS.SHARING_CONFIRM_APPROVE_TITLE : CONSTANTS.SHARING_CONFIRM_REJECT_TITLE;
    const messageKey = isApprove ? CONSTANTS.SHARING_CONFIRM_APPROVE_MESSAGE : CONSTANTS.SHARING_CONFIRM_REJECT_MESSAGE;
    const targetName = `${row?.target?.firstName ?? ''} ${row?.target?.lastName ?? ''}`.trim() || '-';

    this.confirmation.confirm({
      key: 'sharing-action',
      header: this.translate.instant(headerKey),
      message: this.translate.instant(messageKey, { target: targetName }),
      acceptLabel: this.translate.instant(CONSTANTS.COMMON_CONFIRM),
      rejectLabel: this.translate.instant(CONSTANTS.INFO_CANCEL),
      acceptButtonStyleClass: isApprove ? undefined : 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => this.decide(row.id, status),
      reject: () => this.confirmation.close(),
      closeOnEscape: true,
    });
  }

  importApproved(row: SanitizedShareRequestDto) {
    this.family.getFamilyMemberByRole('owner').subscribe((owner: Partial<FamilyMember>) => {
      if (!owner?.id || !owner?.role) {
        return;
      }
      this.baseOwner = { ...owner, id: owner.id, role: owner.role };
      this.family.getMyFamily().subscribe((members: Array<Partial<FamilyMember> & { copiedFromMemberId?: string | null }>) => {
        const match = (members || []).find((m) => m.copiedFromMemberId === row.targetMemberId);
        if (match?.id) {
          this.clonedMemberId = match.id;
          this.showAddDialog.set(true);
        }
      });
    });
  }

  handleDialogSaved(event: {
    relation: string;
    clonedMemberId?: string;
    approvedRequestId?: string;
    member?: Partial<FamilyMember>;
  }) {
    const baseOwner = this.baseOwner;
    if (!baseOwner || (!event?.clonedMemberId && !event?.approvedRequestId)) {
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

    const updateThen = (newId: string) =>
      this.family.getMyFamily().subscribe((members: Partial<FamilyMember>[]) => {
        const prefix = `${baseOwner.role}_${event.relation}`;
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
              fromMemberId: baseOwner.id,
              toMemberId: newId,
              type: relationshipType,
            })
            .subscribe(() => {
              if (event.relation === 'partner') {
                this.family
                  .setPartner(baseOwner.id, newId, PartnerStatus.UNKNOWN)
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
      const member = event.member;
      if (member) {
        this.family.getFamilyMemberById(newId).subscribe((m: Partial<FamilyMember>) => {
          if (m?.role) {
            this.family.updateMemberByRole(m.role, member).subscribe(() => updateThen(newId));
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
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const tabParam = params.get('tab');
      const nextTab = this.toTab(tabParam ?? ShareRequestTab.Incoming);
      this.activeTab.set(nextTab);
      this.notifications.markTabViewed(nextTab);
    });
  }

  private toTab(value: ShareRequestTab | string | number | null | undefined) {
    if (value === ShareRequestTab.Outgoing || value === 'outgoing') {
      return ShareRequestTab.Outgoing;
    }
    return ShareRequestTab.Incoming;
  }
}



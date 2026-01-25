import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SHARED_ANGULAR_IMPORTS } from '../../shared/imports/shared-angular-imports';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { SharingApiService, SearchResultDto } from '../../core/services/sharing-api.service';
import { CONSTANTS } from '../../shared/constants/constants';
import { AddRelativeDialogComponent } from '../../shared/components/add-relative-dialog/add-relative-dialog.component';
import { FamilyService } from '../../core/services/family.service';
import { PartnerStatus } from '../../shared/enums/partner-status.enum';
import { MessageService } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';
import { ShareRequestStatus } from '../../shared/enums/share-request-status.enum';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-global-search-page',
  imports: [
    ...SHARED_ANGULAR_IMPORTS,
    TableModule,
    TagModule,
    DialogModule,
    TextareaModule,
    ButtonModule,
    AddRelativeDialogComponent,
  ],
  templateUrl: './global-search.page.html',
  styleUrls: ['./global-search.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalSearchPage implements OnInit {
  CONSTANTS = CONSTANTS;
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(SharingApiService);
  private family = inject(FamilyService);
  private messages = inject(MessageService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  q = signal('');
  results = signal<SearchResultDto[]>([]);
  loading = signal(false);

  showAddDialog = signal(false);
  baseOwner: any = null;
  clonedMemberId: string | null = null;
  showMsgDialog = signal(false);
  selectedTarget: SearchResultDto | null = null;
  msgDraft = signal('');
  private statusKey: Record<ShareRequestStatus, string> = {
    [ShareRequestStatus.Pending]: CONSTANTS.SHARING_STATUS_PENDING,
    [ShareRequestStatus.Approved]: CONSTANTS.SHARING_STATUS_APPROVED,
    [ShareRequestStatus.Rejected]: CONSTANTS.SHARING_STATUS_REJECTED,
  };

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const value = params.get('q') ?? '';
        this.q.set(value);
        this.search();
      });
  }

  onSubmit() {
    this.router.navigate([], { queryParams: { q: this.q() || null } });
  }

  search() {
    const term = (this.q() || '').trim();
    this.loading.set(true);
    this.api.searchDeceased(term).subscribe({
      next: (res) => {
        this.results.set(res);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openRequestDialog(item: SearchResultDto) {
    if (this.isRequestLocked(item.requestStatus)) {
      return;
    }
    this.selectedTarget = item;
    this.msgDraft.set('');
    this.showMsgDialog.set(true);
  }

  cancelRequestDialog() {
    this.showMsgDialog.set(false);
    this.selectedTarget = null;
    this.msgDraft.set('');
  }

  onRequestDialogVisibleChange(visible: boolean) {
    if (!visible) {
      this.cancelRequestDialog();
    }
  }

  confirmRequestDialog() {
    if (!this.selectedTarget) return;
    const raw = this.msgDraft();
    const message = raw ? String(raw).slice(0, 255) : undefined;
    this.api
      .createShareRequest({ targetMemberId: this.selectedTarget.id, message })
      .subscribe({
        next: () => {
          this.cancelRequestDialog();
          this.search();
        },
        error: (err) => this.handleRequestError(err),
      });
  }

  importDirect(item: SearchResultDto) {
    this.api.cloneDirect(item.id).subscribe(({ newMemberId }) => {
      this.family.getFamilyMemberByRole('owner').subscribe((owner) => {
        this.baseOwner = owner;
        this.clonedMemberId = newMemberId;
        this.showAddDialog.set(true);
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

  private handleRequestError(error: unknown) {
    const detail = this.extractErrorMessage(error);
    this.messages.add({
      severity: 'error',
      summary: this.translate.instant(CONSTANTS.SEARCH_REQUEST_ACCESS),
      detail,
    });
  }

  private extractErrorMessage(error: unknown) {
    const fallback = this.translate.instant(CONSTANTS.SEARCH_REQUEST_ERROR);
    if (!error) return fallback;
    const err: any = error;
    const message = err?.error?.message ?? err?.message;
    if (Array.isArray(message)) {
      return String(message[0] ?? fallback);
    }
    if (typeof message === 'string') {
      return message;
    }
    if (typeof err?.error === 'string') {
      return err.error;
    }
    return fallback;
  }

  requestStatusKey(status?: ShareRequestStatus | null) {
    if (!status) return '';
    return this.statusKey[status] ?? '';
  }

  statusSeverity(status?: ShareRequestStatus | null) {
    if (!status) return 'warn';
    if (status === ShareRequestStatus.Approved) return 'success';
    if (status === ShareRequestStatus.Rejected) return 'danger';
    return 'info';
  }

  isRequestLocked(status?: ShareRequestStatus | null) {
    return (
      status === ShareRequestStatus.Pending ||
      status === ShareRequestStatus.Approved
    );
  }
}

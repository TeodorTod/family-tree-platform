import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SHARED_ANGULAR_IMPORTS } from '../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../shared/imports/shared-primeng-imports';
import { SharingApiService, SearchResultDto } from '../../core/services/sharing-api.service';
import { CONSTANTS } from '../../shared/constants/constants';
import { AddRelativeDialogComponent } from '../../shared/components/add-relative-dialog/add-relative-dialog.component';
import { FamilyService } from '../../core/services/family.service';
import { PartnerStatus } from '../../shared/enums/partner-status.enum';

@Component({
  selector: 'app-global-search-page',
  standalone: true,
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS, AddRelativeDialogComponent],
  templateUrl: './global-search.page.html',
  styleUrls: ['./global-search.page.scss'],
})
export class GlobalSearchPage implements OnInit {
  CONSTANTS = CONSTANTS;
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(SharingApiService);
  private family = inject(FamilyService);

  q = signal('');
  results = signal<SearchResultDto[]>([]);
  loading = signal(false);

  showAddDialog = signal(false);
  baseOwner: any = null;
  clonedMemberId: string | null = null;
  showMsgDialog = signal(false);
  selectedTarget: SearchResultDto | null = null;
  msgDraft = signal('');

  ngOnInit(): void {
    const initialQ = this.route.snapshot.queryParamMap.get('q') ?? '';
    this.q.set(initialQ);
    this.search();
  }

  onSubmit() {
    this.router.navigate([], { queryParams: { q: this.q() || null } });
    this.search();
  }

  search() {
    this.loading.set(true);
    this.api.searchDeceased(this.q()).subscribe({
      next: (res) => {
        this.results.set(res);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openRequestDialog(item: SearchResultDto) {
    this.selectedTarget = item;
    this.msgDraft.set('');
    this.showMsgDialog.set(true);
  }

  cancelRequestDialog() {
    this.showMsgDialog.set(false);
    this.selectedTarget = null;
    this.msgDraft.set('');
  }

  confirmRequestDialog() {
    if (!this.selectedTarget) return;
    const raw = this.msgDraft();
    const message = raw ? String(raw).slice(0, 255) : undefined;
    this.api
      .createShareRequest({ targetMemberId: this.selectedTarget.id, message })
      .subscribe(() => {
        this.cancelRequestDialog();
        this.search();
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
}

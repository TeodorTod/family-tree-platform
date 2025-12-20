import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { SHARED_ANGULAR_IMPORTS } from '../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../shared/imports/shared-primeng-imports';
import { SharingApiService, UpsertMemberConsentDto, UpdateUserSettingsDto } from '../../core/services/sharing-api.service';
import { CONSTANTS } from '../../shared/constants/constants';

@Component({
  selector: 'app-settings-sharing-page',
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './settings-sharing.page.html',
  styleUrls: ['./settings-sharing.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsSharingPage implements OnInit {
  CONSTANTS = CONSTANTS;
  private api = inject(SharingApiService);

  settings = signal<UpdateUserSettingsDto>({});
  rows = signal<(UpsertMemberConsentDto & { memberId: string; firstName: string; lastName: string })[]>([]);

  ngOnInit(): void {
    this.api.getMySettings().subscribe((s) => this.settings.set(s));
    this.api.getMyMembersConsent().subscribe((r) => this.rows.set(r as any));
  }

  saveSettings() {
    this.api.updateMySettings(this.settings()).subscribe((s) => this.settings.set(s));
  }

  saveConsents() {
    const items = this.rows().map((r) => ({ memberId: r.memberId, allowDiscovery: r.allowDiscovery, allowDetails: r.allowDetails }));
    this.api.upsertMyMembersConsent(items).subscribe();
  }

  onDiscoveryDefaultChange(v: boolean) {
    const cur = this.settings();
    this.settings.set({
      allowDeceasedDiscoveryDefault: v,
      allowDeceasedDetailsDefault: cur.allowDeceasedDetailsDefault,
    });
  }

  onDetailsDefaultChange(v: boolean) {
    const cur = this.settings();
    this.settings.set({
      allowDeceasedDiscoveryDefault: cur.allowDeceasedDiscoveryDefault,
      allowDeceasedDetailsDefault: v,
    });
  }
}

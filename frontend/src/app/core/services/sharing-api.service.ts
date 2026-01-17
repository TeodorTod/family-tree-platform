import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ShareRequestStatus } from '../../shared/enums/share-request-status.enum';
import { map, tap } from 'rxjs';
import {
  SanitizedShareRequestDto,
  ShareRequestDto,
  SharingDtoSanitizerService,
} from './sharing-dto-sanitizer.service';

export interface SearchResultDto {
  id: string;
  firstName: string;
  lastName: string;
  birthYear?: number | null;
  deathYear?: number | null;
  photoUrl?: string | null;
  requiresShareApproval: boolean;
  ownerDisplayName?: string | null;
  hasPendingRequest: boolean;
  requestStatus?: ShareRequestStatus | null;
}

export interface UpdateUserSettingsDto {
  allowDeceasedDiscoveryDefault?: boolean;
  allowDeceasedDetailsDefault?: boolean;
  allowAdminSupportAccess?: boolean;
}

export interface UpsertMemberConsentDto {
  memberId: string;
  allowDiscovery: boolean;
  allowDetails: boolean;
}

export interface MemberConsentDto extends UpsertMemberConsentDto {
  firstName: string;
  lastName: string;
}

export interface CreateShareRequestDto {
  targetMemberId: string;
  message?: string;
}

export interface ShareRequestCounters {
  incomingPending: number;
  outgoingDecided: number;
  outgoingUnseen?: number;
}

@Injectable({ providedIn: 'root' })
export class SharingApiService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;
  private sanitizer = inject(SharingDtoSanitizerService);
  private readonly mySettingsSignal = signal<UpdateUserSettingsDto | null>(null);
  readonly mySettings = this.mySettingsSignal.asReadonly();
  private readonly myMembersConsentSignal = signal<MemberConsentDto[]>([]);
  readonly myMembersConsent = this.myMembersConsentSignal.asReadonly();
  private readonly outgoingRequestsSignal = signal<SanitizedShareRequestDto[]>([]);
  readonly outgoingRequests = this.outgoingRequestsSignal.asReadonly();
  private readonly incomingRequestsSignal = signal<SanitizedShareRequestDto[]>([]);
  readonly incomingRequests = this.incomingRequestsSignal.asReadonly();
  private readonly requestCountersSignal = signal<ShareRequestCounters | null>(null);
  readonly requestCounters = this.requestCountersSignal.asReadonly();

  searchDeceased(q?: string, page = 0, size = 20) {
    const params: any = {};
    if (q) params.q = q;
    params.page = page;
    params.size = size;
    return this.http.get<SearchResultDto[]>(`${this.api}/global-search/deceased`, { params });
  }

  getMySettings() {
    return this.http.get<UpdateUserSettingsDto>(`${this.api}/sharing/my-settings`).pipe(
      tap((settings) => this.mySettingsSignal.set(settings)),
    );
  }

  updateMySettings(dto: UpdateUserSettingsDto) {
    return this.http.put<UpdateUserSettingsDto>(`${this.api}/sharing/my-settings`, dto).pipe(
      tap((settings) => this.mySettingsSignal.set(settings)),
    );
  }

  getMyMembersConsent() {
    return this.http
      .get<MemberConsentDto[]>(`${this.api}/sharing/my-members-consent`)
      .pipe(tap((consents) => this.myMembersConsentSignal.set(consents)));
  }

  upsertMyMembersConsent(items: UpsertMemberConsentDto[]) {
    return this.http.put<{ ok: boolean }>(`${this.api}/sharing/my-members-consent`, items);
  }

  createShareRequest(dto: CreateShareRequestDto) {
    return this.http.post(`${this.api}/sharing/requests`, dto);
  }

  getIncomingRequests() {
    return this.http
      .get<ShareRequestDto[]>(`${this.api}/sharing/requests/incoming`)
      .pipe(
        map((res) => this.sanitizer.sanitizeRequests(res)),
        tap((requests) => this.incomingRequestsSignal.set(requests)),
      );
  }

  getOutgoingRequests() {
    return this.http
      .get<ShareRequestDto[]>(`${this.api}/sharing/requests/outgoing`)
      .pipe(
        map((res) => this.sanitizer.sanitizeRequests(res)),
        tap((requests) => this.outgoingRequestsSignal.set(requests)),
      );
  }

  decideRequest(id: string, status: 'APPROVED' | 'REJECTED') {
    return this.http.post<{ newMemberId?: string }>(`${this.api}/sharing/requests/${id}/decide`, { status });
  }

  markOutgoingViewed() {
    return this.http.post<{ ok: boolean }>(`${this.api}/sharing/requests/outgoing/viewed`, {});
  }

  cloneDirect(targetMemberId: string) {
    return this.http.post<{ newMemberId: string }>(`${this.api}/sharing/clone-direct`, { targetMemberId });
  }

  cloneApprovedRequest(requestId: string) {
    return this.http.post<{ newMemberId: string }>(`${this.api}/sharing/requests/${requestId}/clone`, {});
  }

  getRequestCounters() {
    return this.http.get<ShareRequestCounters>(`${this.api}/sharing/requests/counters`).pipe(
      tap((counters) => this.requestCountersSignal.set(counters)),
    );
  }
}

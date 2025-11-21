import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

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
}

export interface UpdateUserSettingsDto {
  allowDeceasedDiscoveryDefault?: boolean;
  allowDeceasedDetailsDefault?: boolean;
}

export interface UpsertMemberConsentDto {
  memberId: string;
  allowDiscovery: boolean;
  allowDetails: boolean;
}

export interface CreateShareRequestDto {
  targetMemberId: string;
  message?: string;
}

export interface ShareRequestCounters {
  incomingPending: number;
  outgoingDecided: number;
}

@Injectable({ providedIn: 'root' })
export class SharingApiService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  searchDeceased(q?: string, page = 0, size = 20) {
    const params: any = {};
    if (q) params.q = q;
    params.page = page;
    params.size = size;
    return this.http.get<SearchResultDto[]>(`${this.api}/global-search/deceased`, { params });
  }

  getMySettings() {
    return this.http.get<UpdateUserSettingsDto>(`${this.api}/sharing/my-settings`);
  }

  updateMySettings(dto: UpdateUserSettingsDto) {
    return this.http.put<UpdateUserSettingsDto>(`${this.api}/sharing/my-settings`, dto);
  }

  getMyMembersConsent() {
    return this.http.get<({ memberId: string; firstName: string; lastName: string } & UpsertMemberConsentDto)[]>(`${this.api}/sharing/my-members-consent`);
  }

  upsertMyMembersConsent(items: UpsertMemberConsentDto[]) {
    return this.http.put<{ ok: boolean }>(`${this.api}/sharing/my-members-consent`, items);
  }

  createShareRequest(dto: CreateShareRequestDto) {
    return this.http.post(`${this.api}/sharing/requests`, dto);
  }

  getIncomingRequests() {
    return this.http.get<any[]>(`${this.api}/sharing/requests/incoming`);
  }

  getOutgoingRequests() {
    return this.http.get<any[]>(`${this.api}/sharing/requests/outgoing`);
  }

  decideRequest(id: string, status: 'APPROVED' | 'REJECTED') {
    return this.http.post<{ newMemberId?: string }>(`${this.api}/sharing/requests/${id}/decide`, { status });
  }

  cloneDirect(targetMemberId: string) {
    return this.http.post<{ newMemberId: string }>(`${this.api}/sharing/clone-direct`, { targetMemberId });
  }

  cloneApprovedRequest(requestId: string) {
    return this.http.post<{ newMemberId: string }>(`${this.api}/sharing/requests/${requestId}/clone`, {});
  }

  getRequestCounters() {
    return this.http.get<ShareRequestCounters>(`${this.api}/sharing/requests/counters`);
  }
}

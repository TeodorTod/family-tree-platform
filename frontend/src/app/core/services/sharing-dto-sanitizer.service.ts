import { Injectable } from '@angular/core';
import { ShareRequestStatus } from '../../shared/enums/share-request-status.enum';

export interface ShareRequestTargetDto {
  firstName?: string | null;
  lastName?: string | null;
  dob?: string | null;
  birthYear?: number | string | null;
  dod?: string | null;
  deathYear?: number | string | null;
  user?: ShareRequestUserDto | null;
}

export interface ShareRequestUserDto {
  displayName?: string | null;
  familyMembers?: ShareRequestFamilyMemberDto[] | null;
}

export interface ShareRequestFamilyMemberDto {
  firstName?: string | null;
  lastName?: string | null;
}

export interface ShareRequestDto {
  id?: string | null;
  status?: ShareRequestStatus | string | null;
  targetMemberId?: string | null;
  message?: string | null;
  createdAt?: string | null;
  requester?: ShareRequestUserDto | null;
  target?: ShareRequestTargetDto | null;
}

export interface SanitizedShareTargetDto {
  firstName: string | null;
  lastName: string | null;
  dob: string | null;
  birthYear: number | null;
  dod: string | null;
  deathYear: number | null;
  user: SanitizedShareRequestUserDto | null;
}

export interface SanitizedShareRequestUserDto {
  displayName: string | null;
  familyMembers: SanitizedShareRequestFamilyMemberDto[];
}

export interface SanitizedShareRequestFamilyMemberDto {
  firstName: string | null;
  lastName: string | null;
}

export interface SanitizedShareRequestDto {
  id: string;
  status: ShareRequestStatus;
  targetMemberId: string | null;
  message: string | null;
  createdAt: string | null;
  requester: SanitizedShareRequestUserDto | null;
  target: SanitizedShareTargetDto;
}

@Injectable({ providedIn: 'root' })
export class SharingDtoSanitizerService {
  sanitizeRequests(payload: ShareRequestDto[] | unknown): SanitizedShareRequestDto[] {
    if (!Array.isArray(payload)) {
      return [];
    }

    return payload
      .map((item) => this.transformRequest(item))
      .filter((req): req is SanitizedShareRequestDto => req !== null);
  }

  private transformRequest(item: unknown): SanitizedShareRequestDto | null {
    if (!this.isShareRequestDto(item)) {
      return null;
    }

    const id = this.sanitizeId(item.id);
    if (!id) {
      return null;
    }

    const status = this.sanitizeStatus(item.status);
    const target = {
      firstName: this.sanitizeText(item.target?.firstName),
      lastName: this.sanitizeText(item.target?.lastName),
      dob: this.sanitizeDate(item.target?.dob),
      birthYear: this.sanitizeYear(item.target?.birthYear),
      dod: this.sanitizeDate(item.target?.dod),
      deathYear: this.sanitizeYear(item.target?.deathYear),
      user: this.sanitizeUser(item.target?.user),
    };

    return {
      id,
      status,
      targetMemberId: this.sanitizeId(item.targetMemberId),
      message: this.sanitizeText(item.message),
      createdAt: this.sanitizeDate(item.createdAt),
      requester: this.sanitizeUser(item.requester),
      target,
    };
  }

  private isShareRequestDto(value: unknown): value is ShareRequestDto {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const dto = value as Record<string, unknown>;
    const target = dto['target'];
    if (target && (typeof target !== 'object' || Array.isArray(target))) {
      return false;
    }
    return true;
  }

  private sanitizeId(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  private sanitizeStatus(value: unknown): ShareRequestStatus {
    if (
      value === ShareRequestStatus.Pending ||
      value === ShareRequestStatus.Approved ||
      value === ShareRequestStatus.Rejected
    ) {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toUpperCase();
      switch (normalized) {
        case ShareRequestStatus.Pending:
          return ShareRequestStatus.Pending;
        case ShareRequestStatus.Approved:
          return ShareRequestStatus.Approved;
        case ShareRequestStatus.Rejected:
          return ShareRequestStatus.Rejected;
      }
    }

    return ShareRequestStatus.Pending;
  }

  private sanitizeText(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    // Drop HTML tags and control characters
    const withoutTags = trimmed.replace(/<[^>]*>?/g, '');
    return withoutTags.replace(/[\u0000-\u001F\u007F]/g, '') || null;
  }

  private sanitizeYear(value: unknown): number | null {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    const rounded = Math.trunc(parsed);
    if (rounded < 1 || rounded > 4000) {
      return null;
    }
    return rounded;
  }

  private sanitizeDate(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    return Number.isNaN(Date.parse(trimmed)) ? null : trimmed;
  }

  private sanitizeUser(value: unknown): SanitizedShareRequestUserDto | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    const dto = value as ShareRequestUserDto;
    const familyMembers = Array.isArray(dto.familyMembers)
      ? dto.familyMembers
      : [];

    const sanitizedMembers = familyMembers
      .map((member) => ({
        firstName: this.sanitizeText(member?.firstName),
        lastName: this.sanitizeText(member?.lastName),
      }))
      .filter((member) => member.firstName || member.lastName);

    return {
      displayName: this.sanitizeText(dto.displayName),
      familyMembers: sanitizedMembers,
    };
  }
}

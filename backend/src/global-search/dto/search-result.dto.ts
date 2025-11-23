import { ShareRequestStatus } from '../../../generated/prisma';

export class SearchResultDto {
  id!: string;
  firstName!: string;
  lastName!: string;
  birthYear?: number | null;
  deathYear?: number | null;
  photoUrl?: string | null;
  requiresShareApproval!: boolean;
  ownerDisplayName?: string | null;
  hasPendingRequest!: boolean;
  requestStatus?: ShareRequestStatus | null;
}

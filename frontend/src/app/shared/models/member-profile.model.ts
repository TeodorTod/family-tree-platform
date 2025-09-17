import { FavoriteItem } from './favorite-item.model';
import { MemberNote } from './member-note.model';

export interface MemberProfile {
  id?: string;
  memberId?: string;

  bio?: string | null;
  coverMediaUrl?: string | null;

  achievements?: any | null;
  facts?: any | null;
  favorites?: FavoriteItem[] | null;
  education?: any | null;
  work?: any | null;
  personalInfo?: any | null;
  stories?: MemberNote[] | null;
  notes?: MemberNote[];

  createdAt?: string;
  updatedAt?: string;
}

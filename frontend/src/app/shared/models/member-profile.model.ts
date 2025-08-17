export interface MemberProfile {
  id?: string;
  memberId?: string;

  bio?: string | null;
  coverMediaUrl?: string | null;

  achievements?: any | null;
  facts?: any | null;
  favorites?: any | null;
  education?: any | null;
  work?: any | null;
  personalInfo?: any | null;

  createdAt?: string;
  updatedAt?: string;
}

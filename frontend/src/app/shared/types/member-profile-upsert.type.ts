import { MemberProfile } from "../models/member-profile.model";

export type UpsertPayload = Partial<
  Pick<
    MemberProfile,
    | 'bio'
    | 'coverMediaUrl'
    | 'achievements'
    | 'facts'
    | 'favorites'
    | 'education'
    | 'work'
    | 'personalInfo'
    | 'stories'
    | 'notes'
  >
>;

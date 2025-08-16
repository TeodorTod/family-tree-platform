import { Relationship } from './relationship.model';

export interface FamilyMember {
  id?: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  gender?: string | null;
  dob?: string | Date | null;
  birthYear?: number | null;
  birthNote?: string | null;
  dod?: string | Date | null;
  deathYear?: number | null;
  deathNote?: string | null;
  isAlive: boolean;
  photoUrl?: string | null;
  relationLabel?: string | null;
  role: 'owner' | 'mother' | 'father' | string;
  translatedRole?: string | null;

  // Optional future relations
  parentOf?: Relationship[];
  childOf?: Relationship[];
  relationships?: Relationship[];
}

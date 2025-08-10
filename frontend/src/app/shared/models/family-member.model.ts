import { Relationship } from './relationship.model';

export interface FamilyMember {
  id?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender?: string;
  dob: string | Date;
  dod?: string | Date;
  isAlive: boolean;
  photoUrl?: string;
  relationLabel?: string;
  role: 'owner' | 'mother' | 'father' | string;
  translatedRole?: string | null; 

  // Optional future relations
  parentOf?: Relationship[];
  childOf?: Relationship[];
  relationships?: Relationship[];
}

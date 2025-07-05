import { Relationship } from "./relationship.model";

export interface FamilyMember {
  id: string;
  userId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: 'male' | 'female' | 'other';
  dob: string; 
  dod?: string; 
  isAlive: boolean;
  photoUrl?: string;
  biography?: string;
  createdAt: string;

  // Optional future relations
  parentOf?: Relationship[];
  childOf?: Relationship[];
}

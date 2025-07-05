import { Injectable, signal } from '@angular/core';
import { FamilyMember } from '../../shared/models/family-member.model';

@Injectable({ providedIn: 'root' })
export class FamilyStateService {
  owner = signal<Partial<FamilyMember> | null>(null);
  mother = signal<Partial<FamilyMember> | null>(null);
  father = signal<Partial<FamilyMember> | null>(null);
  maternalGrandmother = signal<Partial<FamilyMember> | null>(null);
  maternalGrandfather = signal<Partial<FamilyMember> | null>(null);
  paternalGrandmother = signal<Partial<FamilyMember> | null>(null);
  paternalGrandfather = signal<Partial<FamilyMember> | null>(null);
}

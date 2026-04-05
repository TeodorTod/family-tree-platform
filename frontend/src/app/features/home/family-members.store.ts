import { Injectable, computed, signal } from '@angular/core';
import { FamilyMember } from '../../shared/models/family-member.model';

@Injectable({ providedIn: 'root' })
export class FamilyMembersStore {
  private readonly membersState = signal<FamilyMember[]>([]);

  readonly members = computed(() => this.membersState());

  setMembers(members: FamilyMember[]): void {
    this.membersState.set(members);
  }
}

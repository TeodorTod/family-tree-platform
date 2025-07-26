export interface Relationship {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  type: 'parent' | 'child' | 'partner' | 'sibling' | 'other';
}

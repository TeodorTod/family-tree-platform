import { FamilyMember } from '../../../shared/models/family-member.model';

export function parseRole(role: string): {
  base: string;
  relationType: string;
  suffix: string;
} {
  const parts = role.split('_');
  let suffix = '';
  if (parts.length > 1 && /^\d+$/.test(parts[parts.length - 1])) {
    suffix = parts.pop()!;
  }
  const relationType = parts.length > 0 ? parts[parts.length - 1] : '';
  const base = parts.slice(0, -1).join('_');
  return { base, relationType, suffix };
}

export function birthLabel(m: FamilyMember): string {
  if (m.dob) {
    const d = typeof m.dob === 'string' ? new Date(m.dob) : m.dob;
    const y = d instanceof Date && !isNaN(d.getTime()) ? d.getFullYear() : NaN;
    if (Number.isFinite(y)) return String(y);
  }
  if (m.birthYear != null) return String(m.birthYear);
  if (m.birthNote) return m.birthNote;
  return '';
}

export function deathLabel(m: FamilyMember): string {
  if (m.dod) {
    const d = typeof m.dod === 'string' ? new Date(m.dod) : m.dod;
    const y = d instanceof Date && !isNaN(d.getTime()) ? d.getFullYear() : NaN;
    if (Number.isFinite(y)) return String(y);
  }
  if (m.deathYear != null) return String(m.deathYear);
  if (m.deathNote) return m.deathNote;
  return '';
}

export function computeNameLabel(m: FamilyMember): string {
  const first = (m.firstName ?? '').trim();
  const last = (m.lastName ?? '').trim();
  if (first && last) return `${first}\n${last}`;
  return first || last;
}

export function computeNodeLabel(
  m: FamilyMember,
  showBirthInfo: boolean
): string {
  const nameLabel = computeNameLabel(m);
  if (!showBirthInfo) return nameLabel;

  const birth = birthLabel(m);
  if (!birth) return nameLabel;

  if (!m.isAlive) {
    const death = deathLabel(m);
    const life = death ? `${birth}-${death}` : birth;
    return `${nameLabel}\n${life}`;
  }

  return `${nameLabel}\n${birth}`;
}

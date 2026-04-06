import { ElementDefinition } from 'cytoscape';
import { FamilyMember } from '../../../shared/models/family-member.model';
import { Roles } from '../../../shared/enums/roles.enum';
import { computeNodeLabel, parseRole } from './family-graph-labels';
import { FamilyGraphLayoutResult } from './family-graph-layout';

const LINEAGE_ROLES = new Set<string>([
  Roles.MOTHER,
  Roles.FATHER,
  Roles.MATERNAL_GRANDMOTHER,
  Roles.MATERNAL_GRANDFATHER,
  Roles.PATERNAL_GRANDMOTHER,
  Roles.PATERNAL_GRANDFATHER,
]);

function relationshipKind(
  type: string | undefined
): 'parent' | 'partner' | 'sibling' {
  if (type === 'partner') return 'partner';
  if (type === 'sibling') return 'sibling';
  return 'parent';
}

/** Cytoscape node `classes` for stylesheet (owner uses id selector only). */
function graphNodeClasses(role: string): string {
  if (role === Roles.OWNER) return '';
  if (LINEAGE_ROLES.has(role)) return 'graph-lineage';
  const { relationType } = parseRole(role);
  if (relationType === 'partner') return 'graph-partner';
  if (relationType === 'son' || relationType === 'daughter') return 'graph-child';
  if (relationType === 'brother' || relationType === 'sister')
    return 'graph-sibling';
  if (relationType === 'mother' || relationType === 'father')
    return 'graph-lineage';
  return 'graph-extended';
}

type EdgeRelationship = 'parent' | 'partner' | 'sibling';

function canonicalEdgeKey(
  source: string,
  target: string,
  relationship: EdgeRelationship
): string {
  if (relationship === 'partner' || relationship === 'sibling') {
    const [a, b] = [source, target].sort();
    return `${relationship}::${a}::${b}`;
  }
  return `parent::${source}::${target}`;
}

export interface BuildFamilyGraphElementsParams {
  members: FamilyMember[];
  layout: FamilyGraphLayoutResult;
  defaultPhoto: string;
  apiUrl: string;
  showBirthInfo: boolean;
}

export function buildFamilyGraphElements(
  params: BuildFamilyGraphElementsParams
): ElementDefinition[] {
  const { members, layout, defaultPhoto, apiUrl, showBirthInfo } = params;
  const { posMap, dynamic } = layout;
  const elements: ElementDefinition[] = [];
  const seenEdgeKeys = new Set<string>();

  const addEdge = (
    source: string,
    target: string,
    relationship: EdgeRelationship
  ): void => {
    if (!posMap.has(source) || !posMap.has(target) || source === target) {
      return;
    }
    const key = canonicalEdgeKey(source, target, relationship);
    if (seenEdgeKeys.has(key)) return;
    seenEdgeKeys.add(key);
    elements.push({
      data: { source, target, relationship },
    });
  };

  members.forEach((m) => {
    const pos = posMap.get(m.role);
    if (!pos) return;

    const label = computeNodeLabel(m, showBirthInfo);

    const nodeDef: ElementDefinition = {
      data: {
        id: m.role,
        label,
        gender: m.gender?.toLowerCase() ?? undefined,
        photo: m.photoUrl ? `${apiUrl}${m.photoUrl}` : defaultPhoto,
      },
      position: { x: pos.x, y: pos.y },
    };
    const cls = graphNodeClasses(m.role);
    if (cls) nodeDef.classes = cls;
    elements.push(nodeDef);
  });

  addEdge(Roles.MATERNAL_GRANDMOTHER, Roles.MOTHER, 'parent');
  addEdge(Roles.MATERNAL_GRANDFATHER, Roles.MOTHER, 'parent');
  addEdge(Roles.PATERNAL_GRANDMOTHER, Roles.FATHER, 'parent');
  addEdge(Roles.PATERNAL_GRANDFATHER, Roles.FATHER, 'parent');
  addEdge(Roles.MOTHER, Roles.OWNER, 'parent');
  addEdge(Roles.FATHER, Roles.OWNER, 'parent');

  const corePartnerPairs: [string, string][] = [
    [Roles.MATERNAL_GRANDMOTHER, Roles.MATERNAL_GRANDFATHER],
    [Roles.PATERNAL_GRANDMOTHER, Roles.PATERNAL_GRANDFATHER],
    [Roles.MOTHER, Roles.FATHER],
  ];

  corePartnerPairs.forEach(([r1, r2]) => {
    addEdge(r1, r2, 'partner');
  });

  dynamic.forEach((m) => {
    const { base, relationType, suffix } = parseRole(m.role);
    if (!base || !posMap.has(base)) return;

    if (relationType === 'mother' || relationType === 'father') {
      const childMembers = members.filter((cm) => {
        const cmParsed = parseRole(cm.role);
        return (
          cmParsed.base === base &&
          (cmParsed.relationType === 'son' ||
            cmParsed.relationType === 'daughter')
        );
      });

      childMembers.forEach((child) => {
        addEdge(m.role, child.role, 'parent');
      });

      addEdge(m.role, base, 'parent');

      const partnerRel = relationType === 'father' ? 'mother' : 'father';
      const partnerRole =
        `${base}_${partnerRel}` + (suffix ? `_${suffix}` : '');
      if (posMap.has(partnerRole)) {
        addEdge(m.role, partnerRole, 'partner');
      }
    } else if (m.role.endsWith('_partner')) {
      addEdge(base, m.role, 'partner');
    } else if (relationType === 'brother' || relationType === 'sister') {
      addEdge(base, m.role, 'sibling');

      const possibleParents = [`${base}_mother`, `${base}_father`];
      possibleParents.forEach((parentRole) => {
        if (posMap.has(parentRole)) {
          addEdge(parentRole, m.role, 'parent');
        }
      });
    } else if (relationType === 'son' || relationType === 'daughter') {
      addEdge(base, m.role, 'parent');
    }
  });

  members
    .filter((m) => parseRole(m.role).relationType === 'partner')
    .forEach((m) => {
      const { base } = parseRole(m.role);
      if (posMap.has(base)) {
        addEdge(base, m.role, 'partner');
      }
    });

  members.forEach((m) => {
    (m.parentOf || []).forEach((rel) => {
      const target = members.find((x) => x.id === rel.toMemberId);
      if (!target) return;
      const rk = relationshipKind(rel.type);
      addEdge(m.role, target.role, rk);
    });

    (m.childOf || []).forEach((rel) => {
      const source = members.find((x) => x.id === rel.fromMemberId);
      if (!source) return;
      const rk = relationshipKind(rel.type);
      addEdge(source.role, m.role, rk);
    });
  });

  return elements;
}

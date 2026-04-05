import { ElementDefinition } from 'cytoscape';
import { FamilyMember } from '../../../shared/models/family-member.model';
import { Roles } from '../../../shared/enums/roles.enum';
import { computeNodeLabel, parseRole } from './family-graph-labels';
import { FamilyGraphLayoutResult } from './family-graph-layout';

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

  members.forEach((m) => {
    const pos = posMap.get(m.role);
    if (!pos) return;

    const label = computeNodeLabel(m, showBirthInfo);

    elements.push({
      data: {
        id: m.role,
        label,
        gender: m.gender?.toLowerCase() ?? undefined,
        photo: m.photoUrl ? `${apiUrl}${m.photoUrl}` : defaultPhoto,
      },
      position: { x: pos.x, y: pos.y },
    });
  });

  const connect = (s: string, t: string) => {
    if (posMap.has(s) && posMap.has(t)) {
      elements.push({ data: { source: s, target: t } });
    }
  };
  connect(Roles.MATERNAL_GRANDMOTHER, Roles.MOTHER);
  connect(Roles.MATERNAL_GRANDFATHER, Roles.MOTHER);
  connect(Roles.PATERNAL_GRANDMOTHER, Roles.FATHER);
  connect(Roles.PATERNAL_GRANDFATHER, Roles.FATHER);
  connect(Roles.MOTHER, Roles.FATHER);
  connect(Roles.MOTHER, Roles.OWNER);
  connect(Roles.FATHER, Roles.OWNER);

  const corePartnerPairs: [string, string][] = [
    [Roles.MATERNAL_GRANDMOTHER, Roles.MATERNAL_GRANDFATHER],
    [Roles.PATERNAL_GRANDMOTHER, Roles.PATERNAL_GRANDFATHER],
    [Roles.MOTHER, Roles.FATHER],
  ];

  corePartnerPairs.forEach(([r1, r2]) => {
    if (posMap.has(r1) && posMap.has(r2)) {
      elements.push({
        data: { source: r1, target: r2, relationship: 'partner' },
      });
    }
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
        elements.push({
          data: { source: m.role, target: child.role },
        });
      });

      elements.push({
        data: { source: m.role, target: base },
      });

      const partnerRel = relationType === 'father' ? 'mother' : 'father';
      const partnerRole =
        `${base}_${partnerRel}` + (suffix ? `_${suffix}` : '');
      if (posMap.has(partnerRole)) {
        elements.push({
          data: {
            source: m.role,
            target: partnerRole,
            relationship: 'partner',
          },
        });
      }
    } else if (m.role.endsWith('_partner')) {
      elements.push({
        data: { source: base, target: m.role, relationship: 'partner' },
      });
    } else if (relationType === 'brother' || relationType === 'sister') {
      elements.push({
        data: { source: base, target: m.role, relationship: 'sibling' },
      });

      const possibleParents = [`${base}_mother`, `${base}_father`];
      possibleParents.forEach((parentRole) => {
        if (posMap.has(parentRole)) {
          elements.push({
            data: { source: parentRole, target: m.role },
          });
        }
      });
    } else if (relationType === 'son' || relationType === 'daughter') {
      elements.push({
        data: { source: base, target: m.role },
      });
    }
  });

  members
    .filter((m) => parseRole(m.role).relationType === 'partner')
    .forEach((m) => {
      const { base } = parseRole(m.role);
      if (posMap.has(base)) {
        elements.push({
          data: {
            source: base,
            target: m.role,
            relationship: 'partner',
          },
        });
      }
    });

  members.forEach((m) => {
    (m.parentOf || []).forEach((rel) => {
      const source = m;
      const target = members.find((x) => x.id === rel.toMemberId);
      if (!target) return;
      elements.push({
        data: {
          source: source.role,
          target: target.role,
          relationship: rel.type,
        },
      });
    });

    (m.childOf || []).forEach((rel) => {
      const source = members.find((x) => x.id === rel.fromMemberId);
      const target = m;
      if (!source) return;
      elements.push({
        data: {
          source: source.role,
          target: target.role,
          relationship: rel.type,
        },
      });
    });
  });

  return elements;
}

import { FamilyMember } from '../../../shared/models/family-member.model';
import { Roles } from '../../../shared/enums/roles.enum';
import { parseRole } from './family-graph-labels';

const FIXED_ROLE_KEYS: readonly string[] = [
  Roles.OWNER,
  Roles.MOTHER,
  Roles.FATHER,
  Roles.MATERNAL_GRANDMOTHER,
  Roles.MATERNAL_GRANDFATHER,
  Roles.PATERNAL_GRANDMOTHER,
  Roles.PATERNAL_GRANDFATHER,
];

export interface FamilyGraphLayoutResult {
  posMap: Map<string, { x: number; y: number }>;
  pairs: [string, string][];
  mateOf: Map<string, string>;
  dynamic: FamilyMember[];
  tierYs: { grandparents: number; parents: number; owner: number };
  isMobile: boolean;
  W: number;
  H: number;
  nodeSize: number;
  labelMaxWidth: number;
}

export function collectPartnerPairs(
  members: FamilyMember[]
): [string, string][] {
  const pairs: [string, string][] = [];

  const core: [Roles, Roles][] = [
    [Roles.FATHER, Roles.MOTHER],
    [Roles.PATERNAL_GRANDFATHER, Roles.PATERNAL_GRANDMOTHER],
    [Roles.MATERNAL_GRANDFATHER, Roles.MATERNAL_GRANDMOTHER],
  ];
  core.forEach(([a, b]) => {
    if (
      members.some((m) => m.role === a) &&
      members.some((m) => m.role === b)
    ) {
      pairs.push([a, b]);
    }
  });

  const byBase: Record<string, FamilyMember[]> = {};
  members.forEach((m) => {
    const { base } = parseRole(m.role);
    if (base) {
      (byBase[base] = byBase[base] || []).push(m);
    }
  });
  Object.entries(byBase).forEach(([, arr]) => {
    const f = arr.find((x) => parseRole(x.role).relationType === 'father');
    const mo = arr.find((x) => parseRole(x.role).relationType === 'mother');
    if (f && mo) pairs.push([f.role, mo.role]);
  });

  const byId = new Map(members.map((m) => [m.id!, m]));
  const seen = new Set<string>();
  members.forEach((a) => {
    if (!a.partnerId) return;
    const b = byId.get(a.partnerId);
    if (!b) return;
    const key = [a.role, b.role].sort().join('::');
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push([a.role, b.role]);
  });

  const uniq = new Map<string, [string, string]>();
  pairs.forEach(([a, b]) => uniq.set([a, b].sort().join('::'), [a, b]));
  return Array.from(uniq.values());
}

export function enforcePartnerAdjacency(
  posMap: Map<string, { x: number; y: number }>,
  pairs: [string, string][],
  gap: number
): Map<string, string> {
  const mateOf = new Map<string, string>();
  const baseOf = (r: string) => {
    const { base } = parseRole(r);
    return base;
  };

  pairs.forEach(([a, b]) => {
    const pa = posMap.get(a);
    const pb = posMap.get(b);
    if (!pa || !pb) return;

    const aParsed = parseRole(a);
    const bParsed = parseRole(b);
    const aF = aParsed.relationType === 'father';
    const aM = aParsed.relationType === 'mother';
    const bF = bParsed.relationType === 'father';
    const bM = bParsed.relationType === 'mother';
    const sameBase = baseOf(a) === baseOf(b);
    const isGeneratedParents = sameBase && ((aF && bM) || (aM && bF));

    const isChildPartnerPair =
      (aParsed.relationType === 'partner' && baseOf(a) === b) ||
      (bParsed.relationType === 'partner' && baseOf(b) === a);

    const half = gap / 2;
    const y = (pa.y + pb.y) / 2;

    if (isGeneratedParents) {
      const baseRole = baseOf(a)!;
      let mid = posMap.get(baseRole)?.x ?? (pa.x + pb.x) / 2;

      const fatherRole = aF ? a : b;
      const motherRole = aM ? a : b;
      const pf = posMap.get(fatherRole)!;
      const pm = posMap.get(motherRole)!;
      pf.x = mid - half;
      pf.y = y;
      pm.x = mid + half;
      pm.y = y;
      posMap.set(fatherRole, pf);
      posMap.set(motherRole, pm);
    } else if (isChildPartnerPair) {
      const childRole = aParsed.relationType === 'partner' ? b : a;
      const partnerRole = aParsed.relationType === 'partner' ? a : b;

      const childPos = posMap.get(childRole)!;
      const parentRole = baseOf(childRole)!;
      const parentPos = posMap.get(parentRole);

      const mid = childPos.x;
      const childOnLeft = parentPos
        ? parentPos.x < childPos.x
        : childPos.x <= posMap.get(partnerRole)!.x;

      const c = posMap.get(childRole)!;
      const p = posMap.get(partnerRole)!;
      c.x = childOnLeft ? mid - half : mid + half;
      c.y = y;
      p.x = childOnLeft ? mid + half : mid - half;
      p.y = y;

      posMap.set(childRole, c);
      posMap.set(partnerRole, p);
    } else {
      const aIsLeft = pa.x <= pb.x;
      const leftRole = aIsLeft ? a : b;
      const rightRole = aIsLeft ? b : a;
      const mid = (pa.x + pb.x) / 2;

      const pl = posMap.get(leftRole)!;
      const pr = posMap.get(rightRole)!;
      pl.x = mid - half;
      pl.y = y;
      pr.x = mid + half;
      pr.y = y;
      posMap.set(leftRole, pl);
      posMap.set(rightRole, pr);
    }

    mateOf.set(a, b);
    mateOf.set(b, a);
  });

  return mateOf;
}

export function resolveOverlapsXOnly(
  posMap: Map<string, { x: number; y: number }>,
  nodeSize: number,
  W: number,
  ownerX: number,
  mateOf?: Map<string, string>,
  pairGap?: number
): void {
  const sideBuffer = nodeSize + 5;
  const minDist = nodeSize + 10;
  const maxIters = 20;
  const fixedRoles = new Set<string>([
    Roles.OWNER,
    Roles.MOTHER,
    Roles.FATHER,
    Roles.MATERNAL_GRANDMOTHER,
    Roles.MATERNAL_GRANDFATHER,
    Roles.PATERNAL_GRANDMOTHER,
    Roles.PATERNAL_GRANDFATHER,
  ]);

  const clampBySide = (role: string, p: { x: number; y: number }) => {
    if (role === Roles.OWNER) return p;
    if (role.startsWith('maternal_') || role === Roles.MOTHER) {
      p.x = Math.max(p.x, ownerX + sideBuffer);
    } else if (role.startsWith('paternal_') || role === Roles.FATHER) {
      p.x = Math.min(p.x, ownerX - sideBuffer);
    }
    p.x = Math.max(W * 0.05, Math.min(W * 0.95, p.x));
    return p;
  };

  const move = (role: string, dx: number) => {
    let p = posMap.get(role);
    if (!p) return;
    p.x += dx;
    p = clampBySide(role, p);
    posMap.set(role, p);

    const mate = mateOf?.get(role);
    if (mate) {
      let mp = posMap.get(mate);
      if (mp && Math.abs(mp.y - p.y) < nodeSize) {
        mp.x += dx;
        mp = clampBySide(mate, mp);
        posMap.set(mate, mp);
      }
    }
  };

  posMap.forEach((p, role) => {
    if (role === Roles.OWNER) return;
    if (role.startsWith('maternal_') || role === Roles.MOTHER) {
      p.x = Math.max(p.x, ownerX + sideBuffer);
    } else if (role.startsWith('paternal_') || role === Roles.FATHER) {
      p.x = Math.min(p.x, ownerX - sideBuffer);
    }
    p.x = Math.max(W * 0.05, Math.min(W * 0.95, p.x));
  });

  for (let iter = 0; iter < maxIters; iter++) {
    let moved = false;
    const entries = Array.from(posMap.entries());

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [ri, pi] = entries[i];
        const [rj, pj] = entries[j];
        if (Math.abs(pi.y - pj.y) >= nodeSize) continue;

        const dx = pj.x - pi.x;
        const absDx = Math.abs(dx);
        if (absDx >= minDist) continue;

        const push = (minDist - absDx) / 2;
        const iFixed = fixedRoles.has(ri);
        const jFixed = fixedRoles.has(rj);

        if (iFixed && jFixed) continue;
        else if (iFixed) move(rj, dx > 0 ? +push * 2 : -push * 2);
        else if (jFixed) move(ri, dx > 0 ? -push * 2 : +push * 2);
        else {
          move(ri, dx > 0 ? -push : +push);
          move(rj, dx > 0 ? +push : -push);
        }

        if (mateOf && pairGap) {
          const recenterPair = (r: string) => {
            const mate = mateOf.get(r);
            if (!mate) return;

            let pr = posMap.get(r)!;
            let pm = posMap.get(mate)!;
            if (Math.abs(pr.y - pm.y) >= nodeSize) return;

            const mid = (pr.x + pm.x) / 2;

            const rIsLeft = pr.x <= pm.x;
            const leftRole = rIsLeft ? r : mate;
            const rightRole = rIsLeft ? mate : r;

            let pl = posMap.get(leftRole)!;
            let prr = posMap.get(rightRole)!;

            pl.x = mid - pairGap / 2;
            prr.x = mid + pairGap / 2;

            pl = clampBySide(leftRole, pl);
            prr = clampBySide(rightRole, prr);

            posMap.set(leftRole, pl);
            posMap.set(rightRole, prr);
          };

          recenterPair(ri);
          recenterPair(rj);
        }

        moved = true;
      }
    }

    if (!moved) break;
  }
}

export function boostPosMap(
  posMap: Map<string, { x: number; y: number }>,
  anchorX: number,
  anchorY: number,
  sx: number,
  sy: number
): void {
  posMap.forEach((p, key) => {
    p.x = anchorX + (p.x - anchorX) * sx;
    p.y = anchorY + (p.y - anchorY) * sy;
    posMap.set(key, p);
  });
}

export function packRowsBySide(
  posMap: Map<string, { x: number; y: number }>,
  ownerX: number,
  W: number,
  nodeSize: number,
  pairGap: number,
  mateOf: Map<string, string>
): void {
  const epsY = nodeSize * 0.6;
  const minGap = nodeSize + 10;
  const leftBound = W * 0.05;
  const rightBound = W * 0.95;
  const sideBuffer = nodeSize + 5;

  type Block = {
    roles: string[];
    y: number;
    center: number;
    width: number;
  };

  const rows: { y: number; roles: string[] }[] = [];
  posMap.forEach((p, role) => {
    let row = rows.find((r) => Math.abs(r.y - p.y) <= epsY);
    if (!row) rows.push((row = { y: p.y, roles: [] }));
    row.roles.push(role);
  });

  const buildBlocks = (roles: string[]): Block[] => {
    const used = new Set<string>();
    const blocks: Block[] = [];
    for (const r of roles) {
      if (used.has(r)) continue;
      const p = posMap.get(r)!;
      const mate = mateOf.get(r);
      if (
        mate &&
        roles.includes(mate) &&
        Math.abs(posMap.get(mate)!.y - p.y) <= epsY
      ) {
        if (used.has(mate)) continue;
        used.add(r);
        used.add(mate);

        const leftRole = posMap.get(r)!.x <= posMap.get(mate)!.x ? r : mate;
        const rightRole = leftRole === r ? mate : r;

        const base = parseRole(r).base;
        const child = base ? posMap.get(base) : undefined;
        const center = child
          ? child.x
          : (posMap.get(leftRole)!.x + posMap.get(rightRole)!.x) / 2;

        blocks.push({
          roles: [leftRole, rightRole],
          y: p.y,
          center,
          width: pairGap,
        });
      } else {
        used.add(r);
        blocks.push({
          roles: [r],
          y: p.y,
          center: p.x,
          width: nodeSize,
        });
      }
    }
    return blocks;
  };

  const packSide = (blocks: Block[], minX: number, maxX: number) => {
    if (blocks.length === 0) return;

    blocks.sort((a, b) => a.center - b.center);

    let c = Math.max(minX + blocks[0].width / 2, blocks[0].center);
    const centers = new Array<number>(blocks.length);
    centers[0] = c;
    for (let i = 1; i < blocks.length; i++) {
      const need =
        centers[i - 1] + (blocks[i - 1].width + blocks[i].width) / 2 + minGap;
      centers[i] = Math.max(need, blocks[i].center);
    }

    centers[blocks.length - 1] = Math.min(
      centers[blocks.length - 1],
      maxX - blocks[blocks.length - 1].width / 2
    );
    for (let i = blocks.length - 2; i >= 0; i--) {
      const allow =
        centers[i + 1] - (blocks[i + 1].width + blocks[i].width) / 2 - minGap;
      centers[i] = Math.min(centers[i], allow);
    }

    blocks.forEach((b, i) => {
      const cx = Math.max(
        minX + b.width / 2,
        Math.min(maxX - b.width / 2, centers[i])
      );
      if (b.roles.length === 2) {
        const lx = cx - b.width / 2;
        const rx = cx + b.width / 2;
        const [l, r] = b.roles;
        const pl = posMap.get(l)!;
        const pr = posMap.get(r)!;
        pl.x = lx;
        pr.x = rx;
        posMap.set(l, pl);
        posMap.set(r, pr);
      } else {
        const ro = b.roles[0];
        const p = posMap.get(ro)!;
        p.x = cx;
        posMap.set(ro, p);
      }
    });
  };

  rows.forEach((row) => {
    const leftRoles = row.roles.filter(
      (r) => r !== Roles.OWNER && posMap.get(r)!.x < ownerX
    );
    const rightRoles = row.roles.filter(
      (r) => r !== Roles.OWNER && posMap.get(r)!.x >= ownerX
    );

    const leftBlocks = buildBlocks(leftRoles);
    const rightBlocks = buildBlocks(rightRoles);

    const leftMin = leftBound;
    const leftMax = ownerX - sideBuffer;
    const rightMin = ownerX + sideBuffer;
    const rightMax = rightBound;

    packSide(leftBlocks, leftMin, leftMax);
    packSide(rightBlocks, rightMin, rightMax);
  });
}

export interface ComputeFamilyGraphLayoutParams {
  members: FamilyMember[];
  W: number;
  H: number;
  circleSize: number;
  textSize: number;
  showBirthInfo: boolean;
  distanceBoostX: number;
  distanceBoostY: number;
}

export function computeFamilyGraphLayout(
  params: ComputeFamilyGraphLayoutParams
): FamilyGraphLayoutResult {
  const {
    members,
    W,
    H,
    circleSize: nodeSize,
    textSize,
    showBirthInfo,
    distanceBoostX,
    distanceBoostY,
  } = params;

  const isMobile = W < 1400;
  const labelPad = showBirthInfo ? nodeSize * 0.6 : 0;
  const minSpacing = nodeSize + 10 + labelPad;
  const partnerSpacing = minSpacing;
  const labelMaxWidth = nodeSize * (showBirthInfo ? 2.4 : 1.6);
  const shiftH = isMobile ? W * 0.1 : 100;

  const maternalGP = members
    .filter(
      (m) =>
        m.role === Roles.MATERNAL_GRANDMOTHER ||
        m.role === Roles.MATERNAL_GRANDFATHER
    )
    .sort((a, b) => a.role.localeCompare(b.role));
  const paternalGP = members
    .filter(
      (m) =>
        m.role === Roles.PATERNAL_GRANDMOTHER ||
        m.role === Roles.PATERNAL_GRANDFATHER
    )
    .sort((a, b) => a.role.localeCompare(b.role));
  const parents = members
    .filter((m) => m.role === Roles.MOTHER || m.role === Roles.FATHER)
    .sort((a, b) => a.role.localeCompare(b.role));
  const ownerArr = members.filter((m) => m.role === Roles.OWNER);

  const tierYs = {
    grandparents: H * 0.1,
    parents: isMobile ? H * 0.22 : H * 0.28,
    owner: isMobile ? H * 0.32 : H * 0.46,
  };

  const spreadDesktop = (arr: FamilyMember[], y: number) =>
    arr.map((m, i) => ({
      role: m.role,
      x: ((i + 1) * (W * 0.4)) / (arr.length + 1) + W * 0.3,
      y,
    }));
  const spreadMobile = (arr: FamilyMember[], y: number) => {
    const maxWidth = W * 0.95;
    const maxSpacing = 150;
    const minSpacingLocal = 80;
    const spacing = Math.min(
      maxSpacing,
      Math.max(minSpacingLocal, maxWidth / (arr.length + 0.5))
    );
    const totalWidth = (arr.length - 1) * spacing;
    const startX = W / 2 - totalWidth / 2;

    return arr.map((m, i) => ({
      role: m.role,
      x: startX + i * spacing,
      y,
    }));
  };

  const parentPosArr = isMobile
    ? spreadMobile(parents, tierYs.parents)
    : spreadDesktop(parents, tierYs.parents);

  const motherX = parentPosArr.find((p) => p.role === Roles.MOTHER)!.x;
  const fatherX = parentPosArr.find((p) => p.role === Roles.FATHER)!.x;
  const ownerPosArr = ownerArr.map((m) => ({
    role: m.role,
    x: (motherX + fatherX) / 2,
    y: tierYs.owner,
  }));

  const gpMin = Math.max(nodeSize * 1.4, 100);
  const gpMax = Math.max(nodeSize * 2.2, 180);
  const gpGap = isMobile
    ? Math.max(W * 0.12, gpMin)
    : Math.min(gpMax, Math.max(gpMin, Math.abs(fatherX - motherX) * 0.45));

  const makeGpPair = (parentX: number, arr: FamilyMember[]) => {
    const gf = arr.find(
      (a) =>
        a.role === Roles.MATERNAL_GRANDFATHER ||
        a.role === Roles.PATERNAL_GRANDFATHER
    );
    const gm = arr.find(
      (a) =>
        a.role === Roles.MATERNAL_GRANDMOTHER ||
        a.role === Roles.PATERNAL_GRANDMOTHER
    );
    const y = tierYs.grandparents;
    const out: { role: string; x: number; y: number }[] = [];

    if (gf && gm) {
      out.push({ role: gf.role, x: parentX - gpGap / 2, y });
      out.push({ role: gm.role, x: parentX + gpGap / 2, y });
    } else if (gf) {
      out.push({ role: gf.role, x: parentX, y });
    } else if (gm) {
      out.push({ role: gm.role, x: parentX, y });
    }
    return out;
  };

  const grandMatPos = makeGpPair(motherX, maternalGP);
  const grandPatPos = makeGpPair(fatherX, paternalGP);

  const posMap = new Map<string, { x: number; y: number }>();
  parentPosArr.forEach((p) => posMap.set(p.role, { x: p.x, y: p.y }));
  ownerPosArr.forEach((p) => posMap.set(p.role, { x: p.x, y: p.y }));
  grandMatPos.forEach((p) => posMap.set(p.role, { x: p.x, y: p.y }));
  grandPatPos.forEach((p) => posMap.set(p.role, { x: p.x, y: p.y }));

  const dynamic = members.filter((m) => !FIXED_ROLE_KEYS.includes(m.role));

  const byBase = dynamic.reduce((map, m) => {
    const { base } = parseRole(m.role);
    if (base) {
      (map[base] = map[base] || []).push(m);
    }
    return map;
  }, {} as Record<string, FamilyMember[]>);

  const remaining = { ...byBase };
  let didPlace: boolean;

  do {
    didPlace = false;

    for (const [baseRole, group] of Object.entries(remaining)) {
      const basePos = posMap.get(baseRole);
      if (!basePos) continue;

      const shiftVDown = tierYs.owner - tierYs.parents;

      const centerX = W / 2;
      const isFatherSide =
        baseRole === Roles.FATHER ||
        baseRole.startsWith('paternal_') ||
        baseRole.includes('_father') ||
        basePos.x < centerX;

      const isMotherSide =
        baseRole === Roles.MOTHER ||
        baseRole.startsWith('maternal_') ||
        baseRole.includes('_mother') ||
        basePos.x > centerX;

      const dynParents = group.filter((m) => {
        const { relationType } = parseRole(m.role);
        return relationType === 'mother' || relationType === 'father';
      });
      if (dynParents.length > 0) {
        let y: number;
        if (basePos.y === tierYs.owner) y = tierYs.parents;
        else if (basePos.y === tierYs.parents) y = tierYs.grandparents;
        else y = basePos.y - shiftVDown;

        const halfSpace = partnerSpacing / 2;

        const fatherM = dynParents.find(
          (m) => parseRole(m.role).relationType === 'father'
        );
        if (fatherM) {
          let x = basePos.x - halfSpace;
          if (isFatherSide) {
            x = Math.min(x, centerX - 20);
          } else if (isMotherSide) {
            x = Math.max(x, centerX + 20);
          }
          x = Math.max(W * 0.05, Math.min(W * 0.95, x));
          posMap.set(fatherM.role, { x, y });
        }

        const motherM = dynParents.find(
          (m) => parseRole(m.role).relationType === 'mother'
        );
        if (motherM) {
          let x = basePos.x + halfSpace;
          if (isFatherSide) {
            x = Math.min(x, centerX - 20);
          } else if (isMotherSide) {
            x = Math.max(x, centerX + 20);
          }
          x = Math.max(W * 0.05, Math.min(W * 0.95, x));
          posMap.set(motherM.role, { x, y });
        }
      }

      const sibs = group.filter((m) => {
        const { relationType } = parseRole(m.role);
        return relationType === 'brother' || relationType === 'sister';
      });
      if (sibs.length) {
        const genY =
          baseRole.startsWith('maternal_') || baseRole.startsWith('paternal_')
            ? tierYs.grandparents
            : [Roles.MOTHER, Roles.FATHER].includes(baseRole as Roles)
              ? tierYs.parents
              : tierYs.owner;

        const fixedXs = members
          .map((m) => posMap.get(m.role))
          .filter((p) => p?.y === genY)
          .map((p) => p!.x);

        const isFatherBase =
          baseRole === Roles.FATHER || baseRole.startsWith('paternal_');
        const anchorX = fixedXs.length
          ? isFatherBase
            ? Math.min(...fixedXs)
            : Math.max(...fixedXs)
          : basePos.x;

        sibs.forEach((m, i) => {
          let x = isFatherBase
            ? anchorX - shiftH * (i + 1)
            : anchorX + shiftH * (i + 1);

          if (isFatherSide) {
            x = Math.min(x, centerX - 20);
          } else if (isMotherSide) {
            x = Math.max(x, centerX + 20);
          }

          x = Math.max(W * 0.05, Math.min(W * 0.95, x));

          posMap.set(m.role, { x, y: basePos.y });
        });
      }

      group
        .filter((m) => parseRole(m.role).relationType === 'partner')
        .forEach((m, i) => {
          let x = basePos.x - shiftH * (i + 1);

          if (isFatherSide) {
            x = Math.min(x, centerX - 20);
          } else if (isMotherSide) {
            x = Math.max(x, centerX + 20);
          }

          x = Math.max(W * 0.05, Math.min(W * 0.95, x));

          posMap.set(m.role, {
            x,
            y: basePos.y,
          });
        });

      const kids = group.filter((m) => {
        const { relationType } = parseRole(m.role);
        return relationType === 'son' || relationType === 'daughter';
      });
      if (kids.length) {
        const totalW = (kids.length - 1) * shiftH;
        kids.forEach((m, i) => {
          let x = basePos.x - totalW / 2 + shiftH * i;
          const y = basePos.y + shiftVDown;

          if (isFatherSide) {
            x = Math.min(x, centerX - 20);
          } else if (isMotherSide) {
            x = Math.max(x, centerX + 20);
          }

          x = Math.max(W * 0.05, Math.min(W * 0.95, x));

          posMap.set(m.role, { x, y });
        });
      }

      delete remaining[baseRole];
      didPlace = true;
    }
  } while (didPlace && Object.keys(remaining).length);

  const ownerX = posMap.get(Roles.OWNER)!.x;
  const sideBuffer = nodeSize + 5;
  resolveOverlapsXOnly(posMap, nodeSize, W, ownerX);

  posMap.forEach((pos, role) => {
    if (role === Roles.OWNER) return;

    if (role.startsWith('maternal_') || role === Roles.MOTHER) {
      pos.x = Math.max(pos.x, ownerX + sideBuffer);
    } else if (role.startsWith('paternal_') || role === Roles.FATHER) {
      pos.x = Math.min(pos.x, ownerX - sideBuffer);
    }
  });

  const partnerGap = Math.max(nodeSize, 80);
  const pairs = collectPartnerPairs(members);

  const mateOf = enforcePartnerAdjacency(posMap, pairs, partnerGap);
  packRowsBySide(posMap, posMap.get(Roles.OWNER)!.x, W, nodeSize, partnerGap, mateOf);

  {
    const ox = posMap.get(Roles.OWNER)!.x;
    const sb = nodeSize + 5;
    const pf = posMap.get(Roles.FATHER);
    if (pf) posMap.set(Roles.FATHER, { x: ox - sb, y: pf.y });
    const pm = posMap.get(Roles.MOTHER);
    if (pm) posMap.set(Roles.MOTHER, { x: ox + sb, y: pm.y });
  }

  resolveOverlapsXOnly(posMap, nodeSize, W, ownerX, mateOf, partnerGap);

  const fixedRoles = new Set(FIXED_ROLE_KEYS);
  const entries = Array.from(posMap.entries());

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [ra, pa] = entries[i];
      const [rb, pb] = entries[j];

      if (Math.abs(pa.y - pb.y) < nodeSize) {
        const dx = pb.x - pa.x;
        const absDx = Math.abs(dx);

        if (absDx < minSpacing) {
          const shift = (minSpacing - absDx) / 2;
          const isAFixed = fixedRoles.has(ra);
          const isBFixed = fixedRoles.has(rb);

          if (isAFixed && isBFixed) continue;
          else if (isAFixed) {
            if (dx > 0) pb.x += shift * 2;
            else pb.x -= shift * 2;
          } else if (isBFixed) {
            if (dx > 0) pa.x -= shift * 2;
            else pa.x += shift * 2;
          } else {
            if (dx > 0) {
              pa.x -= shift;
              pb.x += shift;
            } else {
              pa.x += shift;
              pb.x -= shift;
            }
          }
          posMap.set(ra, pa);
          posMap.set(rb, pb);
        }
      }
    }
  }

  const owner = posMap.get(Roles.OWNER);
  const anchorX = owner?.x ?? W / 2;
  const anchorY = owner?.y ?? tierYs.owner;
  const yBoost = showBirthInfo ? distanceBoostY + 0.35 : distanceBoostY;
  boostPosMap(posMap, anchorX, anchorY, distanceBoostX, yBoost);

  return {
    posMap,
    pairs,
    mateOf,
    dynamic,
    tierYs,
    isMobile,
    W,
    H,
    nodeSize,
    labelMaxWidth,
  };
}

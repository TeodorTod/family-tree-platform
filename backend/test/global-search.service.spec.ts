import { GlobalSearchService } from '../src/global-search/global-search.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('GlobalSearchService', () => {
  let service: GlobalSearchService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(() => {
    prisma = {
      familyMember: { findMany: jest.fn() },
      userSettings: { findMany: jest.fn() },
      memberShareConsent: { findMany: jest.fn() },
    } as any;
    service = new GlobalSearchService(prisma as any);
  });

  it('filters non-discoverable and respects allowDetails', async () => {
    prisma.familyMember.findMany.mockResolvedValue([
      { id: 'm1', userId: 'u1', firstName: 'John', lastName: 'Doe', birthYear: 1900, deathYear: 1980, photoUrl: null, isAlive: false, user: { displayName: 'Owner1' } },
      { id: 'm2', userId: 'u2', firstName: 'Jane', lastName: 'Smith', birthYear: 1910, deathYear: 1990, photoUrl: null, isAlive: false, user: { displayName: 'Owner2' } },
    ] as any);
    prisma.userSettings.findMany.mockResolvedValue([
      { userId: 'u1', allowDeceasedDiscoveryDefault: true, allowDeceasedDetailsDefault: false },
      { userId: 'u2', allowDeceasedDiscoveryDefault: false, allowDeceasedDetailsDefault: false },
    ] as any);
    prisma.memberShareConsent.findMany.mockResolvedValue([
      { ownerUserId: 'u1', memberId: 'm1', allowDiscovery: true, allowDetails: true },
    ] as any);

    const data = await service.searchDeceased('req', { page: 0, size: 10 } as any);
    expect(data.length).toBe(1);
    expect(data[0].id).toBe('m1');
    expect(data[0].requiresShareApproval).toBe(false);
  });
});


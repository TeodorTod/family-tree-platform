import { SharingService } from '../src/sharing/sharing.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('SharingService clone', () => {
  let service: SharingService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      familyMember: { findUnique: jest.fn() },
      memberProfile: { create: jest.fn() },
      $transaction: (fn: any) => fn(prisma),
    } as Partial<PrismaService> as any;
    service = new SharingService(prisma);
  });

  it('clones member without relationships and sets metadata', async () => {
    prisma.familyMember.findUnique.mockResolvedValue({
      id: 'src1',
      userId: 'owner',
      firstName: 'John',
      middleName: null,
      lastName: 'Doe',
      gender: null,
      dob: null,
      birthYear: 1900,
      birthNote: null,
      dod: null,
      deathYear: 1980,
      deathNote: null,
      isAlive: false,
      photoUrl: null,
      role: 'some',
      relationLabel: null,
      translatedRole: null,
      partnerId: null,
      partnerStatus: null,
      profile: null,
    });

    prisma.familyMember.create = jest.fn().mockResolvedValue({ id: 'new1' });
    prisma.memberProfile.create = jest.fn();
    prisma.familyMember.findFirst = jest.fn().mockResolvedValue(null);

    const id = await service.cloneMemberToUser('src1', 'req');
    expect(id).toBe('new1');
    expect(prisma.familyMember.create).toHaveBeenCalled();
    const arg = prisma.familyMember.create.mock.calls[0][0].data;
    expect(arg.partnerId).toBeNull();
    expect(arg.partnerStatus).toBeNull();
    expect(arg.copiedFromMemberId).toBe('src1');
  });
});


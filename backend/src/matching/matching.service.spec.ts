/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/require-await */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { PrismaService } from '../prisma/prisma.service';
import { GeoService } from '../geo/geo.service';
import { SurplusStatus } from '@prisma/client';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeSurplus(overrides: Partial<any> = {}): any {
  return {
    id: 'surplus-1',
    latitude: 4.6351,
    longitude: -74.0703,
    quantityKg: 15,
    status: SurplusStatus.PUBLISHED,
    expirationAt: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 h ahead
    ...overrides,
  };
}

function makeCandidate(overrides: Partial<any> = {}): any {
  return {
    id: 'user-1',
    email: 'recipient@test.com',
    role: 'BENEFICIARY',
    isVerifiedCharity: false,
    reliabilityScore: 0.9,
    noShowCount: 0,
    distance_m: 800,
    ...overrides,
  };
}

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockPrisma = {
  surplus: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $transaction: jest.fn(),
};

const mockGeo = {
  findNearbyUsers: jest.fn(),
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('MatchingService', () => {
  let service: MatchingService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GeoService, useValue: mockGeo },
      ],
    }).compile();

    service = module.get<MatchingService>(MatchingService);
  });

  // ── rankCandidates ───────────────────────────────────────────────────────

  describe('rankCandidates', () => {
    it('throws NotFoundException when surplus does not exist', async () => {
      mockPrisma.surplus.findUnique.mockResolvedValue(null);

      await expect(service.rankCandidates('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when surplus is not PUBLISHED', async () => {
      mockPrisma.surplus.findUnique.mockResolvedValue(
        makeSurplus({ status: SurplusStatus.ASSIGNED }),
      );

      await expect(service.rankCandidates('surplus-1')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when surplus is expired', async () => {
      mockPrisma.surplus.findUnique.mockResolvedValue(
        makeSurplus({ expirationAt: new Date(Date.now() - 1000) }),
      );

      await expect(service.rankCandidates('surplus-1')).rejects.toThrow(BadRequestException);
    });

    it('returns empty array when no nearby users', async () => {
      mockPrisma.surplus.findUnique.mockResolvedValue(makeSurplus());
      mockGeo.findNearbyUsers.mockResolvedValue([]);

      const result = await service.rankCandidates('surplus-1');
      expect(result).toEqual([]);
    });

    it('scores a verified charity higher than a plain recipient for ≥10 kg offer', async () => {
      mockPrisma.surplus.findUnique.mockResolvedValue(makeSurplus({ quantityKg: 12 }));

      const charity = makeCandidate({
        id: 'charity-1',
        isVerifiedCharity: true,
        reliabilityScore: 0.8,
        distance_m: 500,
      });
      const recipient = makeCandidate({
        id: 'user-2',
        isVerifiedCharity: false,
        reliabilityScore: 1.0,
        distance_m: 200,
      });

      mockGeo.findNearbyUsers.mockResolvedValue([charity, recipient]);

      const ranked = await service.rankCandidates('surplus-1');

      // Charity gets +20 pts for charity priority; recipient does not
      expect(ranked[0].id).toBe('charity-1');
    });

    it('places closer candidate first when scores are equal', async () => {
      mockPrisma.surplus.findUnique.mockResolvedValue(makeSurplus({ quantityKg: 5 }));

      // Both below 10 kg threshold — no charity bonus
      const farUser = makeCandidate({ id: 'far', distance_m: 2000, reliabilityScore: 0.9 });
      const nearUser = makeCandidate({ id: 'near', distance_m: 300, reliabilityScore: 0.9 });

      mockGeo.findNearbyUsers.mockResolvedValue([farUser, nearUser]);

      const ranked = await service.rankCandidates('surplus-1');
      expect(ranked[0].id).toBe('near');
    });

    it('excludes users with noShowCount >= 3 (enforced by GeoService query)', async () => {
      // GeoService already filters noShowCount < 3 in the SQL query.
      // This test verifies that even if one arrives, scoring still works.
      mockPrisma.surplus.findUnique.mockResolvedValue(makeSurplus());
      mockGeo.findNearbyUsers.mockResolvedValue([makeCandidate({ id: 'ok-user', noShowCount: 2 })]);

      const ranked = await service.rankCandidates('surplus-1');
      expect(ranked).toHaveLength(1);
      expect(ranked[0].id).toBe('ok-user');
    });
  });

  // ── match ────────────────────────────────────────────────────────────────

  describe('match', () => {
    it('throws BadRequestException when no candidates available', async () => {
      mockPrisma.surplus.findUnique.mockResolvedValue(makeSurplus());
      mockGeo.findNearbyUsers.mockResolvedValue([]);

      await expect(service.match('surplus-1')).rejects.toThrow(BadRequestException);
    });

    it('executes assignment inside a transaction', async () => {
      mockPrisma.surplus.findUnique.mockResolvedValue(makeSurplus());
      mockGeo.findNearbyUsers.mockResolvedValue([makeCandidate()]);

      const updatedSurplus = makeSurplus({
        status: SurplusStatus.ASSIGNED,
        assignedUserId: 'user-1',
      });

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        // Simulate locked row — still PUBLISHED
        mockPrisma.$queryRaw.mockResolvedValue([
          { id: 'surplus-1', status: SurplusStatus.PUBLISHED },
        ]);
        mockPrisma.surplus.update = jest.fn().mockResolvedValue(updatedSurplus);
        return fn(mockPrisma);
      });

      const result = await service.match('surplus-1');
      expect(result.surplus.status).toBe(SurplusStatus.ASSIGNED);
      expect(result.assignedTo.id).toBe('user-1');
    });

    it('throws ConflictException when surplus is claimed concurrently', async () => {
      mockPrisma.surplus.findUnique.mockResolvedValue(makeSurplus());
      mockGeo.findNearbyUsers.mockResolvedValue([makeCandidate()]);

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        // Simulate concurrent assignment — status already ASSIGNED
        mockPrisma.$queryRaw.mockResolvedValue([
          { id: 'surplus-1', status: SurplusStatus.ASSIGNED },
        ]);
        return fn(mockPrisma);
      });

      await expect(service.match('surplus-1')).rejects.toThrow(ConflictException);
    });
  });

  // ── Scoring formula ──────────────────────────────────────────────────────

  describe('scoring formula', () => {
    it('gives max distance score to a candidate at 0 m', async () => {
      mockPrisma.surplus.findUnique.mockResolvedValue(makeSurplus({ quantityKg: 5 }));
      mockGeo.findNearbyUsers.mockResolvedValue([
        makeCandidate({ distance_m: 0, reliabilityScore: 0 }),
      ]);

      const ranked = await service.rankCandidates('surplus-1');
      // 50 (distance) + 0 (reliability) + 0 (no charity) = 50
      expect(ranked[0].score).toBe(50);
    });

    it('gives full reliability bonus at reliabilityScore=1.0', async () => {
      mockPrisma.surplus.findUnique.mockResolvedValue(makeSurplus({ quantityKg: 5 }));
      mockGeo.findNearbyUsers.mockResolvedValue([
        makeCandidate({ distance_m: 0, reliabilityScore: 1.0 }),
      ]);

      const ranked = await service.rankCandidates('surplus-1');
      // 50 (distance) + 30 (reliability) + 0 = 80
      expect(ranked[0].score).toBe(80);
    });

    it('gives full 100 pts to charity at 0 m with 1.0 score and ≥10 kg', async () => {
      mockPrisma.surplus.findUnique.mockResolvedValue(makeSurplus({ quantityKg: 10 }));
      mockGeo.findNearbyUsers.mockResolvedValue([
        makeCandidate({
          distance_m: 0,
          reliabilityScore: 1.0,
          isVerifiedCharity: true,
        }),
      ]);

      const ranked = await service.rankCandidates('surplus-1');
      // 50 + 30 + 20 = 100
      expect(ranked[0].score).toBe(100);
    });

    it('does NOT give charity bonus for <10 kg offers', async () => {
      mockPrisma.surplus.findUnique.mockResolvedValue(makeSurplus({ quantityKg: 9 }));
      mockGeo.findNearbyUsers.mockResolvedValue([
        makeCandidate({
          distance_m: 0,
          reliabilityScore: 1.0,
          isVerifiedCharity: true,
        }),
      ]);

      const ranked = await service.rankCandidates('surplus-1');
      // 50 + 30 + 0 = 80 (no charity bonus below 10 kg)
      expect(ranked[0].score).toBe(80);
    });
  });
});

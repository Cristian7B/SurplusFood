/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SurplusService } from './surplus.service';
import { PrismaService } from '../prisma/prisma.service';
import { GeoService } from '../geo/geo.service';
import { Role, SurplusStatus } from '@prisma/client';

// ─── Helpers ────────────────────────────────────────────────────────────────

let NOW: Date;

/** Builds a future date `minutesAhead` minutes from now. */
function future(minutesAhead: number): Date {
  return new Date(NOW.getTime() + minutesAhead * 60 * 1000);
}

function makeDonor(overrides: Partial<any> = {}): any {
  return {
    id: 'donor-1',
    role: Role.DONOR,
    email: 'donor@ud.edu.co',
    ...overrides,
  };
}

function makeValidDto(overrides: Partial<any> = {}): any {
  return {
    title: 'Rice and chicken',
    quantityKg: 8,
    foodType: 'cooked',
    latitude: 4.6351,
    longitude: -74.0703,
    expirationAt: future(180).toISOString(), // 3 h ahead — same day
    pickupStartAt: future(60).toISOString(), // 1 h ahead
    pickupEndAt: future(120).toISOString(), // 2 h ahead
    ...overrides,
  };
}

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockPrisma = {
  surplus: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockGeo = {
  isWithinRadius: jest.fn().mockResolvedValue(true),
  updateSurplusLocation: jest.fn().mockResolvedValue(undefined),
  findNearbySurplus: jest.fn().mockResolvedValue([]),
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('SurplusService — temporal validation', () => {
  let service: SurplusService;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-26T12:00:00-05:00'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    NOW = new Date();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SurplusService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GeoService, useValue: mockGeo },
      ],
    }).compile();

    service = module.get<SurplusService>(SurplusService);
  });

  describe('create — temporal rules', () => {
    it('rejects when expirationAt is in the past', async () => {
      const dto = makeValidDto({
        expirationAt: new Date(Date.now() - 1000).toISOString(),
      });

      await expect(service.create(dto, makeDonor())).rejects.toThrow(BadRequestException);
    });

    it('rejects when pickupEndAt exceeds expirationAt', async () => {
      const expiry = future(60);
      const dto = makeValidDto({
        expirationAt: expiry.toISOString(),
        pickupStartAt: future(10).toISOString(),
        pickupEndAt: future(120).toISOString(), // past expiry
      });

      await expect(service.create(dto, makeDonor())).rejects.toThrow(BadRequestException);
    });

    it('rejects when pickup window is less than 30 minutes', async () => {
      const dto = makeValidDto({
        pickupStartAt: future(60).toISOString(),
        pickupEndAt: future(75).toISOString(), // only 15 min window
      });

      await expect(service.create(dto, makeDonor())).rejects.toThrow(BadRequestException);
    });

    it('rejects when pickup window exceeds 3 hours', async () => {
      const dto = makeValidDto({
        pickupStartAt: future(30).toISOString(),
        pickupEndAt: future(30 + 3 * 60 + 1).toISOString(), // 3h 1min
        expirationAt: future(30 + 3 * 60 + 60).toISOString(),
      });

      await expect(service.create(dto, makeDonor())).rejects.toThrow(BadRequestException);
    });

    it('rejects when pickupStartAt is more than 4 hours ahead', async () => {
      const dto = makeValidDto({
        pickupStartAt: future(4 * 60 + 5).toISOString(), // 4h 5min
        pickupEndAt: future(4 * 60 + 65).toISOString(),
        expirationAt: future(4 * 60 + 120).toISOString(),
      });

      await expect(service.create(dto, makeDonor())).rejects.toThrow(BadRequestException);
    });

    it('accepts a valid DTO and creates the surplus', async () => {
      const dto = makeValidDto();
      const created = { id: 'surplus-1', ...dto, status: SurplusStatus.PUBLISHED };
      mockPrisma.surplus.create.mockResolvedValue(created);

      const result = await service.create(dto, makeDonor());
      expect(result.id).toBe('surplus-1');
      expect(mockGeo.updateSurplusLocation).toHaveBeenCalledWith(
        'surplus-1',
        dto.latitude,
        dto.longitude,
      );
    });

    it('rejects BENEFICIARY role trying to create surplus', async () => {
      const dto = makeValidDto();
      const beneficiary = makeDonor({ role: Role.BENEFICIARY });

      await expect(service.create(dto, beneficiary)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create — geolocation rules', () => {
    it('rejects when pickup point is outside 3 km radius', async () => {
      mockGeo.isWithinRadius.mockResolvedValueOnce(false);
      const dto = makeValidDto({ latitude: 6.0, longitude: -74.0 }); // far away

      await expect(service.create(dto, makeDonor())).rejects.toThrow(BadRequestException);
    });
  });

  describe('reject', () => {
    it('increments noShowCount and returns surplus to PUBLISHED', async () => {
      const surplus = {
        id: 'surplus-1',
        status: SurplusStatus.ASSIGNED,
        assignedUserId: 'user-1',
        expirationAt: future(60),
        donorId: 'donor-1',
        donor: {},
        assignedUser: {},
      };
      mockPrisma.surplus.findUnique.mockResolvedValue(surplus);
      mockPrisma.surplus.update.mockResolvedValue({
        ...surplus,
        status: SurplusStatus.PUBLISHED,
        assignedUserId: null,
      });

      // noShowCount increment
      mockPrisma['user'] = { update: jest.fn() };
      (mockPrisma as any).user = { update: jest.fn().mockResolvedValue({}) };

      const user = { id: 'user-1', role: Role.BENEFICIARY };
      const result = await service.reject('surplus-1', user as any);

      expect(result.status).toBe(SurplusStatus.PUBLISHED);
      expect(result.assignedUserId).toBeNull();
    });
  });

  describe('pickup', () => {
    it('rejects pickup before pickupStartAt', async () => {
      const surplus = {
        id: 'surplus-1',
        status: SurplusStatus.ASSIGNED,
        assignedUserId: 'user-1',
        donorId: 'donor-1',
        pickupStartAt: future(60), // 1h in future
        pickupEndAt: future(120),
        expirationAt: future(180),
        donor: {},
        assignedUser: {},
      };
      mockPrisma.surplus.findUnique.mockResolvedValue(surplus);

      const donor = { id: 'donor-1', role: Role.DONOR };
      await expect(service.pickup('surplus-1', donor as any)).rejects.toThrow(BadRequestException);
    });

    it('rejects pickup after pickupEndAt', async () => {
      const surplus = {
        id: 'surplus-1',
        status: SurplusStatus.ASSIGNED,
        assignedUserId: 'user-1',
        donorId: 'donor-1',
        pickupStartAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2h ago
        pickupEndAt: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
        expirationAt: future(60),
        donor: {},
        assignedUser: {},
      };
      mockPrisma.surplus.findUnique.mockResolvedValue(surplus);

      const donor = { id: 'donor-1', role: Role.DONOR };
      await expect(service.pickup('surplus-1', donor as any)).rejects.toThrow(BadRequestException);
    });
  });
});

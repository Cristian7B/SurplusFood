import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeoService, MAX_RADIUS_M, UD_CENTER } from '../geo/geo.service';
import { CreateSurplusDto } from './dto/create-surplus.dto';
import { UpdateSurplusDto } from './dto/update-surplus.dto';
import { ListSurplusQueryDto, NearbyQueryDto } from './dto/query-surplus.dto';
import { Prisma, Role, Surplus, SurplusStatus, User } from '@prisma/client';

/** Bogotá UTC offset in hours. Used for same-day enforcement. */
const BOGOTA_OFFSET_H = -5;

/**
 * Returns the current date string (YYYY-MM-DD) in Bogotá timezone.
 */
function todayBogota(): string {
  const now = new Date();
  const bogota = new Date(now.getTime() + BOGOTA_OFFSET_H * 60 * 60 * 1000);
  return bogota.toISOString().slice(0, 10);
}

/**
 * Returns the date string (YYYY-MM-DD) for a given Date in Bogotá timezone.
 */
function dateBogota(date: Date): string {
  const bogota = new Date(date.getTime() + BOGOTA_OFFSET_H * 60 * 60 * 1000);
  return bogota.toISOString().slice(0, 10);
}

@Injectable()
export class SurplusService {
  constructor(
    private prisma: PrismaService,
    private geo: GeoService,
  ) {}

  // ─────────────────────────────────────────────
  // TEMPORAL VALIDATION
  // ─────────────────────────────────────────────

  /**
   * Validates all temporal business rules for surplus creation/update.
   * Throws BadRequestException if any rule is violated.
   */
  private validateTemporalRules(
    expirationAt: Date,
    pickupStartAt: Date,
    pickupEndAt: Date,
    isCreate = true,
  ): void {
    const today = todayBogota();
    const now = new Date();

    // 1. Same-day rule: expiration must be today in Bogotá timezone
    if (dateBogota(expirationAt) !== today) {
      throw new BadRequestException(
        'Surplus must expire the same calendar day it is published (Bogotá time).',
      );
    }

    // 2. Expiration must be in the future
    if (expirationAt <= now) {
      throw new BadRequestException('expirationAt must be in the future.');
    }

    // 3. pickupStartAt must be after now
    if (pickupStartAt <= now) {
      throw new BadRequestException('pickupStartAt must be in the future.');
    }

    // 4. On creation: pickupStartAt must be at most 4 hours from now
    if (isCreate) {
      const fourHoursFromNow = new Date(now.getTime() + 4 * 60 * 60 * 1000);
      if (pickupStartAt > fourHoursFromNow) {
        throw new BadRequestException('pickupStartAt must be within 4 hours of publication.');
      }
    }

    // 5. pickupEndAt must be after pickupStartAt by at least 30 minutes
    const minWindow = 30 * 60 * 1000; // 30 min in ms
    if (pickupEndAt.getTime() - pickupStartAt.getTime() < minWindow) {
      throw new BadRequestException('Pickup window must be at least 30 minutes.');
    }

    // 6. Pickup window cannot exceed 3 hours
    const maxWindow = 3 * 60 * 60 * 1000; // 3 h in ms
    if (pickupEndAt.getTime() - pickupStartAt.getTime() > maxWindow) {
      throw new BadRequestException('Pickup window cannot exceed 3 hours.');
    }

    // 7. pickupEndAt must not exceed expirationAt
    if (pickupEndAt > expirationAt) {
      throw new BadRequestException('pickupEndAt cannot be after expirationAt.');
    }
  }

  // ─────────────────────────────────────────────
  // GEOLOCATION VALIDATION
  // ─────────────────────────────────────────────

  /**
   * Ensures a pickup point is within the 3 km operational radius
   * around Universidad Distrital. Rejects the request otherwise.
   */
  private async assertWithinOperationalRadius(lat: number, lon: number): Promise<void> {
    const within = await this.geo.isWithinRadius(
      UD_CENTER.lat,
      UD_CENTER.lon,
      lat,
      lon,
      MAX_RADIUS_M,
    );
    if (!within) {
      throw new BadRequestException(
        `Pickup point is outside the 3 km operational radius around Universidad Distrital.`,
      );
    }
  }

  // ─────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────

  async create(dto: CreateSurplusDto, donor: User): Promise<Surplus> {
    if (donor.role !== Role.DONOR && donor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only DONOR accounts can publish surplus.');
    }

    const expirationAt = new Date(dto.expirationAt);
    const pickupStartAt = new Date(dto.pickupStartAt);
    const pickupEndAt = new Date(dto.pickupEndAt);

    this.validateTemporalRules(expirationAt, pickupStartAt, pickupEndAt, true);
    await this.assertWithinOperationalRadius(dto.latitude, dto.longitude);

    const surplus = await this.prisma.surplus.create({
      data: {
        title: dto.title,
        description: dto.description,
        quantityKg: dto.quantityKg,
        quantityUnits: dto.quantityUnits,
        foodType: dto.foodType,
        expirationAt,
        pickupStartAt,
        pickupEndAt,
        latitude: dto.latitude,
        longitude: dto.longitude,
        donorId: donor.id,
      },
    });

    // Update the PostGIS geography column (managed outside Prisma schema)
    await this.geo.updateSurplusLocation(surplus.id, dto.latitude, dto.longitude);

    return surplus;
  }

  // ─────────────────────────────────────────────
  // READ — LIST
  // ─────────────────────────────────────────────

  async findAll(query: ListSurplusQueryDto) {
    const { page = 1, limit = 20, status, foodType } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SurplusWhereInput = {};
    if (status) where.status = status;
    if (foodType) where.foodType = foodType;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.surplus.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          donor: { select: { id: true, name: true, email: true } },
          assignedUser: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.surplus.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─────────────────────────────────────────────
  // READ — NEARBY
  // ─────────────────────────────────────────────

  async findNearby(query: NearbyQueryDto) {
    const { lat, lon, radius } = query;
    return this.geo.findNearbySurplus(lat, lon, radius);
  }

  // ─────────────────────────────────────────────
  // READ — SINGLE
  // ─────────────────────────────────────────────

  async findOne(id: string): Promise<Surplus & { donor: any; assignedUser: any }> {
    const surplus = await this.prisma.surplus.findUnique({
      where: { id },
      include: {
        donor: { select: { id: true, name: true, email: true, role: true } },
        assignedUser: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (!surplus) throw new NotFoundException(`Surplus ${id} not found.`);

    // Auto-expire stale records on read
    if (surplus.status === SurplusStatus.PUBLISHED && new Date() > surplus.expirationAt) {
      await this.prisma.surplus.update({
        where: { id },
        data: { status: SurplusStatus.EXPIRED },
      });
      surplus.status = SurplusStatus.EXPIRED;
    }

    return surplus;
  }

  // ─────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────

  async update(id: string, dto: UpdateSurplusDto, requester: User): Promise<Surplus> {
    const surplus = await this.findOne(id);

    if (surplus.donorId !== requester.id && requester.role !== Role.ADMIN) {
      throw new ForbiddenException('You can only edit your own surplus.');
    }

    if (surplus.status !== SurplusStatus.PUBLISHED) {
      throw new BadRequestException('Only PUBLISHED surplus can be edited.');
    }

    const expirationAt = dto.expirationAt ? new Date(dto.expirationAt) : surplus.expirationAt;
    const pickupStartAt = dto.pickupStartAt ? new Date(dto.pickupStartAt) : surplus.pickupStartAt;
    const pickupEndAt = dto.pickupEndAt ? new Date(dto.pickupEndAt) : surplus.pickupEndAt;

    if (dto.expirationAt || dto.pickupStartAt || dto.pickupEndAt) {
      this.validateTemporalRules(expirationAt, pickupStartAt, pickupEndAt, false);
    }

    const newLat = dto.latitude ?? surplus.latitude;
    const newLon = dto.longitude ?? surplus.longitude;

    if (dto.latitude !== undefined || dto.longitude !== undefined) {
      await this.assertWithinOperationalRadius(newLat, newLon);
    }

    const updated = await this.prisma.surplus.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.quantityKg !== undefined && { quantityKg: dto.quantityKg }),
        ...(dto.quantityUnits !== undefined && { quantityUnits: dto.quantityUnits }),
        ...(dto.foodType && { foodType: dto.foodType }),
        expirationAt,
        pickupStartAt,
        pickupEndAt,
        latitude: newLat,
        longitude: newLon,
      },
    });

    if (dto.latitude !== undefined || dto.longitude !== undefined) {
      await this.geo.updateSurplusLocation(id, newLat, newLon);
    }

    return updated;
  }

  // ─────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────

  async remove(id: string, requester: User): Promise<{ message: string }> {
    const surplus = await this.findOne(id);

    if (surplus.donorId !== requester.id && requester.role !== Role.ADMIN) {
      throw new ForbiddenException('You can only delete your own surplus.');
    }

    if (surplus.status === SurplusStatus.ASSIGNED) {
      throw new BadRequestException(
        'Cannot delete an already-assigned surplus. Expire it instead.',
      );
    }

    await this.prisma.surplus.delete({ where: { id } });
    return { message: `Surplus ${id} deleted.` };
  }

  // ─────────────────────────────────────────────
  // ACTION: ACCEPT
  // ─────────────────────────────────────────────

  /**
   * A recipient/charity explicitly accepts a surplus that has been
   * assigned to them by the matching engine.
   */
  async accept(id: string, requester: User): Promise<Surplus> {
    const surplus = await this.findOne(id);

    if (surplus.status !== SurplusStatus.ASSIGNED) {
      throw new BadRequestException('Surplus is not in ASSIGNED status.');
    }

    if (surplus.assignedUserId !== requester.id) {
      throw new ForbiddenException('This surplus was not assigned to you.');
    }

    if (new Date() > surplus.expirationAt) {
      throw new BadRequestException('Cannot accept an expired surplus.');
    }

    // Status stays ASSIGNED — acceptance is a confirmation, pickup is the next step
    return surplus;
  }

  // ─────────────────────────────────────────────
  // ACTION: REJECT
  // ─────────────────────────────────────────────

  /**
   * Assigned recipient rejects the surplus — returns it to PUBLISHED
   * so it can be re-matched or claimed by another candidate.
   */
  async reject(id: string, requester: User): Promise<Surplus> {
    const surplus = await this.findOne(id);

    if (surplus.status !== SurplusStatus.ASSIGNED) {
      throw new BadRequestException('Only ASSIGNED surplus can be rejected.');
    }

    if (surplus.assignedUserId !== requester.id && requester.role !== Role.ADMIN) {
      throw new ForbiddenException('You are not the assigned recipient.');
    }

    if (new Date() > surplus.expirationAt) {
      throw new BadRequestException('Surplus has already expired.');
    }

    // Increment no-show counter for the rejecting user
    await this.prisma.user.update({
      where: { id: surplus.assignedUserId! },
      data: { noShowCount: { increment: 1 } },
    });

    return this.prisma.surplus.update({
      where: { id },
      data: { status: SurplusStatus.PUBLISHED, assignedUserId: null },
    });
  }

  // ─────────────────────────────────────────────
  // ACTION: PICKUP
  // ─────────────────────────────────────────────

  /**
   * Marks a surplus as PICKED_UP. Can only be confirmed by the donor
   * or an admin within the pickup window.
   */
  async pickup(id: string, requester: User): Promise<Surplus> {
    const surplus = await this.findOne(id);

    if (surplus.status !== SurplusStatus.ASSIGNED) {
      throw new BadRequestException('Only ASSIGNED surplus can be picked up.');
    }

    if (surplus.donorId !== requester.id && requester.role !== Role.ADMIN) {
      throw new ForbiddenException('Only the donor or admin can confirm pickup.');
    }

    const now = new Date();
    if (now < surplus.pickupStartAt) {
      throw new BadRequestException('Pickup window has not started yet.');
    }

    if (now > surplus.pickupEndAt) {
      throw new BadRequestException('Pickup window has already closed.');
    }

    // Reward the recipient with a reliability score boost
    if (surplus.assignedUserId) {
      await this.prisma.user.update({
        where: { id: surplus.assignedUserId },
        data: {
          reliabilityScore: { increment: 0.05 },
        },
      });
    }

    return this.prisma.surplus.update({
      where: { id },
      data: { status: SurplusStatus.PICKED_UP },
    });
  }

  // ─────────────────────────────────────────────
  // ACTION: EXPIRE
  // ─────────────────────────────────────────────

  /** Manually expires a surplus. Restricted to ADMIN or the donor. */
  async expire(id: string, requester: User): Promise<Surplus> {
    const surplus = await this.findOne(id);

    if (surplus.donorId !== requester.id && requester.role !== Role.ADMIN) {
      throw new ForbiddenException('Only the donor or admin can expire a surplus.');
    }

    if (surplus.status === SurplusStatus.PICKED_UP || surplus.status === SurplusStatus.EXPIRED) {
      throw new BadRequestException(`Cannot expire a surplus with status ${surplus.status}.`);
    }

    return this.prisma.surplus.update({
      where: { id },
      data: { status: SurplusStatus.EXPIRED },
    });
  }
}

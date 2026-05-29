import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Maximum operational radius enforced by the platform (meters). */
export const MAX_RADIUS_M = 3000;

/** Universidad Distrital reference point (centre of the 3 km zone). */
export const UD_CENTER = { lat: 4.6351, lon: -74.0703 };

export interface NearbySurplus {
  id: string;
  title: string;
  foodType: string;
  quantityKg: number;
  quantityUnits: number | null;
  status: string;
  latitude: number;
  longitude: number;
  pickupStartAt: Date;
  pickupEndAt: Date;
  expirationAt: Date;
  donorId: string;
  distance_m: number;
}

export interface NearbyUser {
  id: string;
  email: string;
  role: string;
  latitude: number | null;
  longitude: number | null;
  reliabilityScore: number;
  noShowCount: number;
  isVerifiedCharity: boolean;
  distance_m: number;
}

/**
 * Provides PostGIS-backed spatial queries for the surplus platform.
 * All distance filtering uses ST_DWithin on the geography(Point,4326)
 * `location` column, which is managed via raw SQL migration.
 */
@Injectable()
export class GeoService {
  constructor(private prisma: PrismaService) {}

  /**
   * Finds surplus items within `radiusM` metres of the given coordinates.
   * Only returns PUBLISHED status items that have not expired.
   */
  async findNearbySurplus(
    lat: number,
    lon: number,
    radiusM: number = MAX_RADIUS_M,
  ): Promise<NearbySurplus[]> {
    const safeRadius = Math.min(radiusM, MAX_RADIUS_M);

    const rows = await this.prisma.$queryRaw<NearbySurplus[]>`
      SELECT
        s.id,
        s.title,
        s."foodType",
        s."quantityKg",
        s."quantityUnits",
        s.status,
        s.latitude,
        s.longitude,
        s."pickupStartAt",
        s."pickupEndAt",
        s."expirationAt",
        s."donorId",
        ROUND(
          ST_Distance(
            s.location::geography,
            ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography
          )::numeric, 2
        ) AS distance_m
      FROM "Surplus" s
      WHERE
        s.status = 'PUBLISHED'
        AND s."expirationAt" > NOW()
        AND ST_DWithin(
          s.location::geography,
          ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
          ${safeRadius}
        )
      ORDER BY distance_m ASC
    `;

    return rows;
  }

  /**
   * Finds users (BENEFICIARY or CHARITY) within `radiusM` metres of a point.
   * Used by the matching engine to build the candidate pool.
   */
  async findNearbyUsers(
    lat: number,
    lon: number,
    radiusM: number = MAX_RADIUS_M,
  ): Promise<NearbyUser[]> {
    const safeRadius = Math.min(radiusM, MAX_RADIUS_M);

    const rows = await this.prisma.$queryRaw<NearbyUser[]>`
      SELECT
        u.id,
        u.email,
        u.role,
        u.latitude,
        u.longitude,
        u."reliabilityScore",
        u."noShowCount",
        u."isVerifiedCharity",
        ROUND(
          ST_Distance(
            ST_SetSRID(ST_MakePoint(u.longitude, u.latitude), 4326)::geography,
            ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography
          )::numeric, 2
        ) AS distance_m
      FROM "User" u
      WHERE
        u.role IN ('BENEFICIARY', 'CHARITY')
        AND u.latitude IS NOT NULL
        AND u.longitude IS NOT NULL
        AND u."noShowCount" < 3
        AND ST_DWithin(
          ST_SetSRID(ST_MakePoint(u.longitude, u.latitude), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
          ${safeRadius}
        )
      ORDER BY distance_m ASC
    `;

    return rows;
  }

  /**
   * Updates the PostGIS geography column for a surplus record.
   * Must be called whenever latitude/longitude is set or changed.
   */
  async updateSurplusLocation(surplusId: string, lat: number, lon: number): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE "Surplus"
      SET location = ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography
      WHERE id = ${surplusId}
    `;
  }

  /**
   * Returns true if (lat2, lon2) is within `radiusM` metres of (lat1, lon1).
   * Uses the PostGIS spheroidal distance function for ±50m accuracy.
   */
  async isWithinRadius(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    radiusM: number = MAX_RADIUS_M,
  ): Promise<boolean> {
    const result = await this.prisma.$queryRaw<[{ within: boolean }]>`
      SELECT ST_DWithin(
        ST_SetSRID(ST_MakePoint(${lon1}, ${lat1}), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${lon2}, ${lat2}), 4326)::geography,
        ${radiusM}
      ) AS within
    `;
    return result[0]?.within ?? false;
  }
}

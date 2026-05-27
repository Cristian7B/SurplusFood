import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeoService, MAX_RADIUS_M } from '../geo/geo.service';
import { SurplusStatus } from '@prisma/client';

export interface ScoredCandidate {
  id: string;
  email: string;
  role: string;
  isVerifiedCharity: boolean;
  reliabilityScore: number;
  noShowCount: number;
  distance_m: number;
  score: number;
}

/**
 * Computes a composite matching score (0–100) for a candidate.
 *
 * Weights (from system design spec):
 *   50% — proximity (closer = higher score)
 *   30% — reliability score (0.0–1.0 normalized to 0–30 pts)
 *   20% — charity priority (flat +20 if verified charity AND surplus ≥ 10 kg)
 */
function computeScore(candidate: Omit<ScoredCandidate, 'score'>, surplusKg: number): number {
  // Distance component: full 50 pts at 0 m, 0 pts at MAX_RADIUS_M
  const distancePts = 50 * Math.max(0, 1 - candidate.distance_m / MAX_RADIUS_M);

  // Reliability component: 0–30 pts proportional to reliability score
  const reliabilityPts = 30 * Math.min(1, Math.max(0, candidate.reliabilityScore));

  // Charity priority: verified charities get +20 pts when surplus >= 10 kg
  const charityPts = candidate.isVerifiedCharity && surplusKg >= 10 ? 20 : 0;

  return Math.round(distancePts + reliabilityPts + charityPts);
}

@Injectable()
export class MatchingService {
  constructor(
    private prisma: PrismaService,
    private geo: GeoService,
  ) {}

  /**
   * Builds and returns a ranked list of candidates without assigning.
   * Useful for previewing the match or re-running after a rejection.
   */
  async rankCandidates(surplusId: string): Promise<ScoredCandidate[]> {
    const surplus = await this.prisma.surplus.findUnique({
      where: { id: surplusId },
    });

    if (!surplus) throw new NotFoundException(`Surplus ${surplusId} not found.`);

    if (surplus.status !== SurplusStatus.PUBLISHED) {
      throw new BadRequestException(
        `Surplus is not in PUBLISHED status (current: ${surplus.status}).`,
      );
    }

    if (new Date() > surplus.expirationAt) {
      throw new BadRequestException('Surplus has expired and cannot be matched.');
    }

    const candidates = await this.geo.findNearbyUsers(
      surplus.latitude,
      surplus.longitude,
      MAX_RADIUS_M,
    );

    if (candidates.length === 0) return [];

    const scored: ScoredCandidate[] = candidates.map((c) => ({
      ...c,
      score: computeScore(c as any, surplus.quantityKg),
    }));

    // Sort descending by score; ties broken by proximity
    scored.sort((a, b) => b.score - a.score || a.distance_m - b.distance_m);

    return scored;
  }

  /**
   * Executes the matching algorithm and atomically assigns the best
   * candidate to the surplus using a row-level lock (SELECT FOR UPDATE)
   * to prevent duplicate assignments under concurrent requests.
   *
   * Target: < 2 seconds end-to-end.
   */
  async match(surplusId: string): Promise<{
    surplus: any;
    assignedTo: ScoredCandidate;
    score: number;
  }> {
    const ranked = await this.rankCandidates(surplusId);

    if (ranked.length === 0) {
      throw new BadRequestException('No eligible candidates found within the 3 km radius.');
    }

    const best = ranked[0];

    // Atomic assignment inside a serializable transaction with row lock
    const result = await this.prisma.$transaction(async (tx) => {
      // Lock the surplus row to prevent concurrent assignments
      const locked = await tx.$queryRaw<{ id: string; status: string }[]>`
        SELECT id, status FROM "Surplus"
        WHERE id = ${surplusId}
        FOR UPDATE
      `;

      if (!locked.length) {
        throw new NotFoundException('Surplus not found.');
      }

      if (locked[0].status !== SurplusStatus.PUBLISHED) {
        throw new ConflictException(
          `Surplus was already claimed (status: ${locked[0].status}). Concurrent request won the race.`,
        );
      }

      const updated = await tx.surplus.update({
        where: { id: surplusId },
        data: {
          status: SurplusStatus.ASSIGNED,
          assignedUserId: best.id,
        },
        include: {
          donor: { select: { id: true, name: true, email: true } },
          assignedUser: { select: { id: true, name: true, email: true } },
        },
      });

      return updated;
    });

    return { surplus: result, assignedTo: best, score: best.score };
  }

  /**
   * Re-runs matching for a surplus that was rejected or returned to PUBLISHED.
   * Idempotent — safe to call multiple times.
   */
  async rematch(surplusId: string): Promise<{
    surplus: any;
    assignedTo: ScoredCandidate;
    score: number;
  }> {
    // Ensure it's back in PUBLISHED before re-matching
    const surplus = await this.prisma.surplus.findUnique({
      where: { id: surplusId },
    });

    if (!surplus) throw new NotFoundException(`Surplus ${surplusId} not found.`);

    if (surplus.status !== SurplusStatus.PUBLISHED) {
      throw new BadRequestException(`Cannot re-match — surplus status is ${surplus.status}.`);
    }

    return this.match(surplusId);
  }
}

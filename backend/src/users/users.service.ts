import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /** Find a user by their primary key — used by JwtStrategy to validate tokens. */
  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /** Find a user by email — used for auth flows. */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  /**
   * Adjusts a user's reliability score by `delta` (positive or negative).
   * Score is clamped to the range [0.0, 1.0].
   */
  async updateReliabilityScore(userId: string, delta: number): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const newScore = Math.min(1.0, Math.max(0.0, user.reliabilityScore + delta));

    await this.prisma.user.update({
      where: { id: userId },
      data: { reliabilityScore: newScore },
    });
  }

  /** Increments the user's no-show counter. Used when a pickup is missed. */
  async incrementNoShow(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { noShowCount: { increment: 1 } },
    });
  }

  /** Saves or clears the Expo push token for a user. */
  async updatePushToken(userId: string, expoPushToken: string | null): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { expoPushToken },
    });
  }
}

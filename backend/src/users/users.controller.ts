/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unused-vars */
import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import type { User } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { NotificationsService } from '../notifications/notifications.service';

class UpdatePushTokenDto {
  @IsString()
  @IsOptional()
  expoPushToken: string | null;
}

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the current user profile' })
  @ApiResponse({ status: 200, description: 'Profile returned successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getProfile(@CurrentUser() user: User) {
    const { password, ...result } = user as any;
    return result;
  }

  @Post('me/test-push')
  @ApiOperation({ summary: 'Send a test push notification to the current user (dev only)' })
  async testPush(@CurrentUser() user: User): Promise<{ ok: boolean; token: string | null }> {
    const full = await this.usersService.findById((user as any).id);
    const token = (full as any)?.expoPushToken ?? null;
    await this.notificationsService.sendPush(token, {
      title: '🔔 Test desde el backend',
      body: 'El NotificationsService está funcionando correctamente',
      data: { type: 'TEST' },
    });
    return { ok: true, token };
  }

  @Patch('me/push-token')
  @ApiOperation({ summary: 'Save or clear the Expo push token for the current user' })
  @ApiResponse({ status: 200, description: 'Push token updated.' })
  async updatePushToken(
    @CurrentUser() user: User,
    @Body() dto: UpdatePushTokenDto,
  ): Promise<{ ok: boolean }> {
    await this.usersService.updatePushToken((user as any).id, dto.expoPushToken ?? null);
    return { ok: true };
  }
}

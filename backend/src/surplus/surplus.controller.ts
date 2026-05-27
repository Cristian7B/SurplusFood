import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';

import { SurplusService } from './surplus.service';
import { MatchingService } from '../matching/matching.service';
import { CreateSurplusDto } from './dto/create-surplus.dto';
import { UpdateSurplusDto } from './dto/update-surplus.dto';
import { ListSurplusQueryDto, NearbyQueryDto } from './dto/query-surplus.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Surplus')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('surplus')
export class SurplusController {
  constructor(
    private readonly surplusService: SurplusService,
    private readonly matchingService: MatchingService,
  ) {}

  // ──────────────────────────────────────────────
  // POST /surplus
  // ──────────────────────────────────────────────

  @Post()
  @Roles(Role.DONOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Publish a new surplus',
    description:
      'Creates a surplus offer. Restricted to DONOR and ADMIN. ' +
      'Pickup point must be within 3 km of Universidad Distrital. ' +
      'Temporal rules: same-day expiration, pickup window 30 min–3 h, ' +
      'pickupStartAt within 4 hours of now.',
  })
  @ApiBody({ type: CreateSurplusDto })
  @ApiResponse({ status: 201, description: 'Surplus published successfully.' })
  @ApiResponse({ status: 400, description: 'Validation or business rule failure.' })
  @ApiResponse({ status: 403, description: 'Insufficient role.' })
  create(@Body() dto: CreateSurplusDto, @CurrentUser() user: User) {
    return this.surplusService.create(dto, user);
  }

  // ──────────────────────────────────────────────
  // GET /surplus
  // ──────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'List all surplus (paginated)',
    description: 'Returns a paginated list. Filter by status and foodType.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PUBLISHED', 'ASSIGNED', 'PICKED_UP', 'EXPIRED'],
  })
  @ApiQuery({ name: 'foodType', required: false, example: 'cooked' })
  @ApiResponse({ status: 200, description: 'Paginated surplus list.' })
  findAll(@Query() query: ListSurplusQueryDto) {
    return this.surplusService.findAll(query);
  }

  // ──────────────────────────────────────────────
  // GET /surplus/nearby
  // ──────────────────────────────────────────────

  @Get('nearby')
  @ApiOperation({
    summary: 'Find surplus within the 3 km operational radius',
    description:
      'Returns PUBLISHED, non-expired surplus sorted by distance. ' +
      'Uses PostGIS ST_DWithin on the geography column. ' +
      'Max radius capped at 3000 m regardless of query param.',
  })
  @ApiQuery({ name: 'lat', required: true, example: 4.6351 })
  @ApiQuery({ name: 'lon', required: true, example: -74.0703 })
  @ApiQuery({ name: 'radius', required: false, example: 1500, description: 'Metres (max 3000)' })
  @ApiResponse({ status: 200, description: 'List of nearby surplus with distance_m.' })
  @ApiResponse({ status: 400, description: 'Invalid coordinates.' })
  findNearby(@Query() query: NearbyQueryDto) {
    return this.surplusService.findNearby(query);
  }

  // ──────────────────────────────────────────────
  // GET /surplus/:id
  // ──────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get a single surplus by ID' })
  @ApiParam({ name: 'id', description: 'Surplus UUID' })
  @ApiResponse({ status: 200, description: 'Surplus found.' })
  @ApiResponse({ status: 404, description: 'Surplus not found.' })
  findOne(@Param('id') id: string) {
    return this.surplusService.findOne(id);
  }

  // ──────────────────────────────────────────────
  // PATCH /surplus/:id
  // ──────────────────────────────────────────────

  @Patch(':id')
  @Roles(Role.DONOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Update a surplus',
    description:
      'Partial update. Only PUBLISHED surplus can be edited. ' +
      'Only the original donor or an ADMIN can modify.',
  })
  @ApiParam({ name: 'id', description: 'Surplus UUID' })
  @ApiBody({ type: UpdateSurplusDto })
  @ApiResponse({ status: 200, description: 'Surplus updated.' })
  @ApiResponse({ status: 400, description: 'Validation failure or wrong status.' })
  @ApiResponse({ status: 403, description: 'Not the owner.' })
  @ApiResponse({ status: 404, description: 'Not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateSurplusDto, @CurrentUser() user: User) {
    return this.surplusService.update(id, dto, user);
  }

  // ──────────────────────────────────────────────
  // DELETE /surplus/:id
  // ──────────────────────────────────────────────

  @Delete(':id')
  @Roles(Role.DONOR, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a surplus (only if PUBLISHED or EXPIRED)' })
  @ApiParam({ name: 'id', description: 'Surplus UUID' })
  @ApiResponse({ status: 200, description: 'Surplus deleted.' })
  @ApiResponse({ status: 400, description: 'Cannot delete assigned surplus.' })
  @ApiResponse({ status: 403, description: 'Not the owner.' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.surplusService.remove(id, user);
  }

  // ──────────────────────────────────────────────
  // POST /surplus/:id/match
  // ──────────────────────────────────────────────

  @Post(':id/match')
  @Roles(Role.ADMIN, Role.DONOR)
  @ApiOperation({
    summary: 'Trigger the matching engine',
    description:
      'Scores nearby eligible recipients/charities and atomically assigns ' +
      'the best candidate. Uses SELECT FOR UPDATE to prevent race conditions. ' +
      'Charities with ≥10 kg offers receive a +20 pt priority bonus. ' +
      'Target latency < 2 seconds.',
  })
  @ApiParam({ name: 'id', description: 'Surplus UUID' })
  @ApiResponse({ status: 201, description: 'Matched and assigned.' })
  @ApiResponse({ status: 400, description: 'No candidates or wrong status.' })
  @ApiResponse({ status: 409, description: 'Concurrent claim — retry.' })
  match(@Param('id') id: string) {
    return this.matchingService.match(id);
  }

  // ──────────────────────────────────────────────
  // POST /surplus/:id/accept
  // ──────────────────────────────────────────────

  @Post(':id/accept')
  @Roles(Role.RECIPIENT, Role.CHARITY)
  @ApiOperation({
    summary: 'Accept an assigned surplus',
    description:
      'The assigned recipient/charity confirms they will collect the surplus. ' +
      'Must be called before the pickup window closes.',
  })
  @ApiParam({ name: 'id', description: 'Surplus UUID' })
  @ApiResponse({ status: 201, description: 'Surplus accepted.' })
  @ApiResponse({ status: 400, description: 'Wrong status or expired.' })
  @ApiResponse({ status: 403, description: 'Not assigned to you.' })
  accept(@Param('id') id: string, @CurrentUser() user: User) {
    return this.surplusService.accept(id, user);
  }

  // ──────────────────────────────────────────────
  // POST /surplus/:id/reject
  // ──────────────────────────────────────────────

  @Post(':id/reject')
  @Roles(Role.RECIPIENT, Role.CHARITY, Role.ADMIN)
  @ApiOperation({
    summary: 'Reject an assigned surplus',
    description:
      'Returns the surplus to PUBLISHED so it can be re-matched. ' +
      "Increments the rejecting user's no-show counter. " +
      'Users with 3+ no-shows are excluded from future matching.',
  })
  @ApiParam({ name: 'id', description: 'Surplus UUID' })
  @ApiResponse({ status: 201, description: 'Surplus returned to PUBLISHED.' })
  @ApiResponse({ status: 400, description: 'Wrong status.' })
  @ApiResponse({ status: 403, description: 'Not the assigned recipient.' })
  reject(@Param('id') id: string, @CurrentUser() user: User) {
    return this.surplusService.reject(id, user);
  }

  // ──────────────────────────────────────────────
  // POST /surplus/:id/pickup
  // ──────────────────────────────────────────────

  @Post(':id/pickup')
  @Roles(Role.DONOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Confirm pickup — mark as PICKED_UP',
    description:
      'The donor confirms the surplus was collected within the pickup window. ' +
      "Boosts the recipient's reliability score by 0.05. " +
      'Must be called between pickupStartAt and pickupEndAt.',
  })
  @ApiParam({ name: 'id', description: 'Surplus UUID' })
  @ApiResponse({ status: 201, description: 'Surplus marked as PICKED_UP.' })
  @ApiResponse({ status: 400, description: 'Outside pickup window or wrong status.' })
  @ApiResponse({ status: 403, description: 'Not the donor.' })
  pickup(@Param('id') id: string, @CurrentUser() user: User) {
    return this.surplusService.pickup(id, user);
  }

  // ──────────────────────────────────────────────
  // POST /surplus/:id/expire
  // ──────────────────────────────────────────────

  @Post(':id/expire')
  @Roles(Role.DONOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Manually expire a surplus',
    description:
      'Forces a surplus into EXPIRED status. ' +
      'Not applicable to already PICKED_UP or EXPIRED items.',
  })
  @ApiParam({ name: 'id', description: 'Surplus UUID' })
  @ApiResponse({ status: 201, description: 'Surplus expired.' })
  @ApiResponse({ status: 400, description: 'Already in terminal state.' })
  @ApiResponse({ status: 403, description: 'Not the donor or admin.' })
  expire(@Param('id') id: string, @CurrentUser() user: User) {
    return this.surplusService.expire(id, user);
  }
}

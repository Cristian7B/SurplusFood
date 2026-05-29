/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { SurplusStatus } from '@prisma/client';

export class NearbyQueryDto {
  @ApiPropertyOptional({ example: 4.6351, description: 'Observer latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Transform(({ value }) => parseFloat(value))
  lat: number;

  @ApiPropertyOptional({ example: -74.0703, description: 'Observer longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Transform(({ value }) => parseFloat(value))
  lon: number;

  @ApiPropertyOptional({
    example: 1500,
    description: 'Search radius in metres (max 3000)',
  })
  @IsNumber()
  @Min(1)
  @Max(3000)
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  radius?: number;
}

export class ListSurplusQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;

  @ApiPropertyOptional({ enum: SurplusStatus })
  @IsEnum(SurplusStatus)
  @IsOptional()
  status?: SurplusStatus;

  @ApiPropertyOptional({ example: 'cooked' })
  @IsString()
  @IsOptional()
  foodType?: string;
}

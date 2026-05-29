import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const FOOD_TYPES = ['cooked', 'bakery', 'produce', 'packaged', 'dairy', 'other'] as const;

export class CreateSurplusDto {
  @ApiProperty({ example: 'Lunch leftovers — rice and chicken' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Three pans of arroz con pollo' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '/uploads/surplus.jpg' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ example: 8.5, description: 'Weight in kilograms' })
  @IsNumber()
  @Min(0.1)
  @Max(500)
  quantityKg: number;

  @ApiPropertyOptional({ example: 30, description: 'Number of meal units' })
  @IsInt()
  @Min(1)
  @IsOptional()
  quantityUnits?: number;

  @ApiProperty({
    example: 'cooked',
    enum: FOOD_TYPES,
  })
  @IsIn(FOOD_TYPES)
  foodType: string;

  @ApiProperty({
    example: '2026-05-27T22:00:00.000Z',
    description: 'Hard expiration — must be same calendar day (Bogotá time)',
  })
  @IsDateString()
  expirationAt: string;

  @ApiProperty({
    example: '2026-05-27T18:00:00.000Z',
    description: 'Earliest pickup time',
  })
  @IsDateString()
  pickupStartAt: string;

  @ApiProperty({
    example: '2026-05-27T20:00:00.000Z',
    description: 'Latest pickup time (max window: 3 hours)',
  })
  @IsDateString()
  pickupEndAt: string;

  @ApiProperty({ example: 4.6351, description: 'Pickup point latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: -74.0703, description: 'Pickup point longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}

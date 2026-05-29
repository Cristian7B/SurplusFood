import { IsEmail, IsString, MinLength, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'donor@ud.edu.co' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: 'BENEFICIARY',
    enum: ['DONOR', 'BENEFICIARY', 'beneficiary', 'donor'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['DONOR', 'BENEFICIARY', 'beneficiary', 'donor', 'CHARITY', 'ADMIN'])
  role?: string;
}

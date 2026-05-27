import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'donor@ud.edu.co' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}

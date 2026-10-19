import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'sales1@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

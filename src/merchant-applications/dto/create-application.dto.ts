import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  businessName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  legalBusinessName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  businessType: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  ownerFirstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  ownerLastName: string;

  @ApiProperty()
  @IsEmail()
  ownerEmail: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  requestedMonthlyVolume?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  businessWebsite?: string;
}

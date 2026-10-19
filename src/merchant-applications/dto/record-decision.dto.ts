import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Decision } from '../enums/decision.enum.js';

export class RecordDecisionDto {
  @ApiProperty({ enum: Decision })
  @IsEnum(Decision)
  decision: Decision;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

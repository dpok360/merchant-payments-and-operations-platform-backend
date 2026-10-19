import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MerchantApplicationsService } from './merchant-applications.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { UpdateApplicationDto } from './dto/update-application.dto.js';
import { ListApplicationsQueryDto } from './dto/list-applications-query.dto.js';
import { AssignReviewerDto } from './dto/assign-reviewer.dto.js';
import { RecordDecisionDto } from './dto/record-decision.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../users/enums/role.enum.js';
import { User } from '../users/entities/user.entity.js';

@ApiTags('applications')
@ApiBearerAuth()
@Controller('applications')
export class MerchantApplicationsController {
  constructor(private readonly service: MerchantApplicationsService) {}

  @Post()
  @Roles(Role.SALES, Role.ADMIN)
  @ApiOperation({ summary: 'Create a merchant application' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() dto: CreateApplicationDto, @CurrentUser() user: User) {
    return this.service.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List merchant applications' })
  @ApiResponse({ status: 200 })
  findAll(@Query() query: ListApplicationsQueryDto, @CurrentUser() user: User) {
    return this.service.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a merchant application by ID' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a merchant application' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 422, description: 'Invalid state for editing' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApplicationDto,
    @CurrentUser() user: User,
  ) {
    return this.service.update(id, dto, user);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit application for risk review' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 409, description: 'Already submitted' })
  submit(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.service.submit(id, user);
  }

  @Patch(':id/assign-reviewer')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Assign a reviewer to an application (ADMIN only)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  assignReviewer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignReviewerDto,
    @CurrentUser() user: User,
  ) {
    return this.service.assignReviewer(id, dto, user);
  }

  @Post(':id/decisions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a review decision' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 403, description: 'Forbidden — not assigned reviewer' })
  @ApiResponse({ status: 422, description: 'Invalid state for decision' })
  recordDecision(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordDecisionDto,
    @CurrentUser() user: User,
  ) {
    return this.service.recordDecision(id, dto, user);
  }
}

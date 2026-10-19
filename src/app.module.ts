import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { RedisModule } from './redis/redis.module.js';
import { HealthModule } from './health/health.module.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AuditModule } from './audit/audit.module.js';
import { MerchantApplicationsModule } from './merchant-applications/merchant-applications.module.js';
import { RiskModule } from './risk/risk.module.js';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    RedisModule,
    HealthModule,
    UsersModule,
    AuthModule,
    AuditModule,
    MerchantApplicationsModule,
    RiskModule,
  ],
})
export class AppModule {}

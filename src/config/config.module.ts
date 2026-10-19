import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from './configuration.js';
import { configValidationSchema } from './config.schema.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: configValidationSchema,
      envFilePath: ['.env'],
    }),
  ],
})
export class AppConfigModule {}

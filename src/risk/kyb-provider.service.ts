import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KybResult } from './dto/kyb-result.dto.js';

@Injectable()
export class KybProviderService implements OnModuleInit {
  private readonly logger = new Logger(KybProviderService.name);
  private simulationMode: string;
  private delayMs: number;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.simulationMode = this.configService.get<string>('risk.kybSimulationMode') ?? 'random';
    this.delayMs = this.configService.get<number>('risk.kybSimulationDelayMs') ?? 500;

    const nodeEnv = this.configService.get<string>('nodeEnv');
    if (nodeEnv === 'production' && this.simulationMode === 'always_pass') {
      throw new Error('KYB_SIMULATION_MODE=always_pass is not allowed in production');
    }
  }

  async checkBusiness(applicationId: string): Promise<KybResult> {
    await this.delay(this.delayMs);

    const passed =
      this.simulationMode === 'always_pass'
        ? true
        : this.simulationMode === 'always_fail'
          ? false
          : Math.random() > 0.2;

    const result: KybResult = {
      passed,
      score: passed
        ? Math.floor(Math.random() * 30) + 70
        : Math.floor(Math.random() * 40),
      flags: passed ? [] : ['UNVERIFIED_ADDRESS'],
      reference: `kyb-sim-${applicationId.slice(0, 8)}-${Date.now()}`,
    };

    this.logger.log({
      event: 'kyb_result',
      applicationId,
      passed: result.passed,
      score: result.score,
      reference: result.reference,
    });

    return result;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

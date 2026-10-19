import { Injectable } from '@nestjs/common';

@Injectable()
export class RedactionService {
  private static readonly BLOCKED_FIELDS = new Set([
    'password',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'api_key',
    'ownerEmail',
    'ownerPhone',
    'ssn',
    'taxId',
    'tax_id',
    'bankAccount',
    'bank_account',
    'cardNumber',
    'card_number',
    'cvv',
  ]);

  redact(data: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (RedactionService.BLOCKED_FIELDS.has(key)) continue;
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.redact(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}

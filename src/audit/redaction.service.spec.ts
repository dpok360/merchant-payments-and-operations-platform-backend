import { RedactionService } from './redaction.service.js';

describe('RedactionService', () => {
  let service: RedactionService;

  beforeEach(() => {
    service = new RedactionService();
  });

  it('strips password from flat object', () => {
    const result = service.redact({ password: 'secret', name: 'test' });
    expect(result).not.toHaveProperty('password');
    expect(result).toHaveProperty('name', 'test');
  });

  it('strips passwordHash', () => {
    expect(service.redact({ passwordHash: 'hash' })).not.toHaveProperty('passwordHash');
  });

  it('strips token', () => {
    expect(service.redact({ token: 'abc' })).not.toHaveProperty('token');
  });

  it('strips ownerEmail', () => {
    expect(service.redact({ ownerEmail: 'x@y.com' })).not.toHaveProperty('ownerEmail');
  });

  it('strips nested blocked field', () => {
    const result = service.redact({ user: { password: 'x', name: 'y' } });
    expect((result['user'] as Record<string, unknown>)).not.toHaveProperty('password');
    expect((result['user'] as Record<string, unknown>)['name']).toBe('y');
  });

  it('retains non-blocked keys', () => {
    const result = service.redact({ score: 82, reference: 'ref-123' });
    expect(result).toEqual({ score: 82, reference: 'ref-123' });
  });

  it('returns empty object for empty input', () => {
    expect(service.redact({})).toEqual({});
  });

  it('preserves arrays without recursing into them', () => {
    const result = service.redact({ flags: ['a', 'b'] });
    expect(result['flags']).toEqual(['a', 'b']);
  });

  it('strips apiKey', () => {
    expect(service.redact({ apiKey: 'key123' })).not.toHaveProperty('apiKey');
  });
});

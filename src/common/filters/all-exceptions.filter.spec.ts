import { jest } from '@jest/globals';
import { AllExceptionsFilter } from './all-exceptions.filter.js';
import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';

function mockHost(url = '/test') {
  const json = jest.fn();
  const statusFn = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status: statusFn }),
      getRequest: () => ({ url, method: 'GET' }),
    }),
  } as unknown as ArgumentsHost;
  return { host, statusFn, json };
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
  });

  it('maps HttpException to its status', () => {
    const { host, statusFn } = mockHost();
    filter.catch(new NotFoundException('not found'), host);
    expect(statusFn).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
  });

  it('maps unknown error to 500', () => {
    const { host, statusFn } = mockHost();
    filter.catch(new Error('boom'), host);
    expect(statusFn).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('response shape includes statusCode, message, timestamp, path', () => {
    const { host, json } = mockHost('/api/v1/test');
    filter.catch(new HttpException('bad request', HttpStatus.BAD_REQUEST), host);
    const payload = json.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).toHaveProperty('statusCode');
    expect(payload).toHaveProperty('message');
    expect(payload).toHaveProperty('timestamp');
    expect(payload).toHaveProperty('path');
  });
});

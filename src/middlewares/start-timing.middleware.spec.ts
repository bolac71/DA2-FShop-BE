import { EventEmitter } from 'node:events';
import { NextFunction, Request, Response } from 'express';
import { MetricsService } from 'src/modules/metrics/metrics.service';
import { StartTimingMiddleware } from './start-timing.middleware';

describe('StartTimingMiddleware', () => {
  it('attaches request id and records HTTP metrics on response finish', () => {
    const metricsService = {
      recordHttpRequest: jest.fn(),
    } as unknown as MetricsService;
    const middleware = new StartTimingMiddleware(metricsService);
    const response = new EventEmitter() as Response;
    response.setHeader = jest.fn() as unknown as Response['setHeader'];
    response.statusCode = 201;
    const request = {
      method: 'POST',
      path: '/api/v1/orders',
      headers: {
        'x-request-id': 'request-123',
      },
    } as unknown as Request;
    const next: NextFunction = jest.fn();

    middleware.use(request, response, next);
    response.emit('finish');

    expect(request['requestId']).toBe('request-123');
    expect(response.setHeader).toHaveBeenCalledWith(
      'x-request-id',
      'request-123',
    );
    expect(next).toHaveBeenCalled();
    expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
      'POST',
      '/api/v1/orders',
      201,
      expect.any(Number),
    );
  });
});

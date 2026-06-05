import { randomUUID } from 'node:crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { MetricsService } from 'src/modules/metrics/metrics.service';

@Injectable()
export class StartTimingMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const pinoRequestId = (req as Request & { id?: string }).id;
    const requestId =
      req.headers['x-request-id']?.toString() ||
      req.headers['x-correlation-id']?.toString() ||
      pinoRequestId ||
      randomUUID();

    req['startTime'] = startTime;
    req['requestId'] = requestId;
    res.setHeader('x-request-id', requestId);

    res.on('finish', () => {
      const durationMs = Date.now() - startTime;
      const route = this.resolveRoute(req);
      this.metricsService.recordHttpRequest(
        req.method,
        route,
        res.statusCode,
        durationMs,
      );
    });

    next();
  }

  private resolveRoute(req: Request): string {
    const routePath = req.route?.path as string | undefined;
    const baseUrl = req.baseUrl || '';

    if (routePath) {
      return `${baseUrl}${routePath}` || req.path;
    }

    return req.path || 'unknown';
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { MetricsController } from '../src/modules/metrics/metrics.controller';
import { MetricsService } from '../src/modules/metrics/metrics.service';
import { describe, beforeEach, afterEach, it, expect } from '@jest/globals';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController, MetricsController],
      providers: [AppService, MetricsService],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    const metricsService = moduleFixture.get(MetricsService);
    app.use((req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      req['startTime'] = startTime;
      req['requestId'] = 'e2e-request-id';
      res.on('finish', () => {
        metricsService.recordHttpRequest(
          req.method,
          req.path,
          res.statusCode,
          Date.now() - startTime,
        );
      });
      next();
    });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api/v1/health (GET)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect(({ body }: { body: { status: string; timestamp: string } }) => {
        expect(body.status).toBe('ok');
        expect(new Date(body.timestamp).toString()).not.toBe('Invalid Date');
      });
  });

  it('/api/v1/metrics (GET)', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    return request(app.getHttpServer())
      .get('/api/v1/metrics')
      .expect(200)
      .expect('Content-Type', /text\/plain/)
      .expect(({ text }: { text: string }) => {
        expect(text).toContain('fshop_backend_http_requests_total');
        expect(text).toContain('route="/api/v1/health"');
      });
  });
});

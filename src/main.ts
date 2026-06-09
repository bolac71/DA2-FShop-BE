import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { Logger as PinoLogger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useLogger(app.get(PinoLogger));
  const httpServer = app.getHttpServer() as { setTimeout: (timeout: number) => void; requestTimeout?: number; headersTimeout?: number; keepAliveTimeout?: number };
  httpServer.setTimeout(300000);
  httpServer.requestTimeout = 300000;
  httpServer.headersTimeout = 310000;
  httpServer.keepAliveTimeout = 310000;
  // prefix API
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'ngrok-skip-browser-warning',
      'X-Requested-With',
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  // swagger
  const config = new DocumentBuilder()
    .setTitle('E-commerce Fashion API')
    .setDescription('API documentation for the e-commerce fashion website')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, documentFactory);
  const logger = new Logger('bootstrap');
  const port = process.env.PORT as string;
  await app.listen(port);
  logger.log(`Server is running on port ${port}`);
 logger.log(`Swagger is running on http://localhost:${port}/api/v1/docs`);
}
bootstrap();

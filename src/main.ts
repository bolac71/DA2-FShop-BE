import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // prefix API
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: [process.env.FE_URL],
    credentials: true,
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
  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  logger.log(`Server is running on port ${port}`);
  logger.log(`Swagger is running on http://localhost:${port}/api/v1/docs`);
}
bootstrap();

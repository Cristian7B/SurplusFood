import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';

import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  // Ensure uploads directory exists
  if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve uploaded images statically
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  // ── Global prefix ────────────────────────────
  app.setGlobalPrefix('api');

  // ── CORS ─────────────────────────────────────
  app.enableCors();

  // ── Validation ───────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true,
      transform: true, // Auto-transform query params to declared types
    }),
  );

  // ── Global response envelope ─────────────────
  app.useGlobalInterceptors(new ResponseInterceptor());

  // ── Global error format ──────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── Swagger / OpenAPI ────────────────────────
  const config = new DocumentBuilder()
    .setTitle('FoodBridge API')
    .setDescription(
      'Food Waste Reduction Platform — redistributes surplus food within a 3 km radius ' +
        'around Universidad Distrital, Bogotá. Backend: NestJS + PostgreSQL + PostGIS.',
    )
    .setVersion('1.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
    .addTag('Auth', 'Registration and login')
    .addTag('Surplus', 'Surplus lifecycle and matching')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 FoodBridge API running on http://localhost:${process.env.PORT ?? 3000}/api`);
  console.log(`📖 Swagger docs at   http://localhost:${process.env.PORT ?? 3000}/api/docs`);
}

void bootstrap();

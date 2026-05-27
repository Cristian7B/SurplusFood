import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

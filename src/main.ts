import * as crypto from 'crypto';
if (!(global as any).crypto) {
  (global as any).crypto = crypto.webcrypto;
}
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { AllWsExceptionsFilter } from './common/websockets/ws-exception.filter';
// import { RateLimiterMiddleware } from './common/middlewares/ratelimit.middleware';
import { SeedService } from './database/seed/seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Run database seeding
  try {
    const seedService = app.get(SeedService);
    await seedService.seed();
  } catch (error) {
    console.error('Failed to seed database:', error);
    // Optionally: process.exit(1) if seeding is critical
  }

  // app.useGlobalFilters(new AllWsExceptionsFilter())
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'https://main.d1hhmap7x29mpz.amplifyapp.com',
      'https://minbarapp.com',
      'https://dev.minbarapp.com',
    ],
  });
  // app.use(helmet());
  // app.use(compression());
  // app.use(cookieParser());
  // app.use('/uploads', express.static('uploads',{setHeaders: (res, path) => {
  //   res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  //   res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  //   res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  // },} ) )
  // app.use(new RateLimiterMiddleware().use)
  app.setGlobalPrefix('api');
  const config = new DocumentBuilder()
    .setTitle('MINBAR')
    .setDescription('Minbar API Documentation')
    .setVersion('1.0')
    .addTag('minbar')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  await app.listen(3000);
  const url = await app.getUrl();
  console.log(`Application is running at: ${url}`);
}
bootstrap();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { UrlConfig } from './config/url.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Validate URL configuration
  UrlConfig.validateConfig();
  
  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });
  
  // Serve static files from uploads directory (before global prefix)
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  // Global prefix for all routes
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  const apiUrl = UrlConfig.getApiBaseUrl();
  console.log(`🚀 Urembo Hub API is running on: ${apiUrl}/api`);
}

bootstrap();

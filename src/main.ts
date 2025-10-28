import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule); // Creación de la aplicación NestJS
  app.useGlobalPipes(new ValidationPipe()); // Configuración de validación global
  app.setGlobalPrefix('/api'); // Prefijo global para todas las rutas
  app.enableCors({
    origin: [
      'http://localhost:3000', // Desarrollo local
      'https://palero-soft-app.vercel.app', // Producción
      'https://palerosoft.movilapp.net/', // Producción
      'http://168.231.75.145', // Producción
      'http://palerosoftware.com', // Producción
      'https://www.palerosoftware.com', // Producción
    ],
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3002); // Puerto del servidor, por defecto 3002
  Logger.log(
    `🚀 Servidor iniciado en http://localhost:${process.env.PORT ?? 3002} en modo ${process.env.NODE_ENV}`, // Log del servidor iniciado
    'Bootstrap',
  );
}
void bootstrap();

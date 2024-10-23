import cors from '@fastify/cors';
import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
const CORS_OPTIONS = {
  origin: true,
  allowedHeaders: [
    'Access-Control-Allow-Origin',
    'Origin',
    'X-Requested-With',
    'Accept',
    'Content-Type',
    'Authorization',
    'Api-Key',
  ],
  exposedHeaders: 'Authorization',
  credentials: true,
  methods: ['GET', 'PATCH', 'OPTIONS', 'POST', 'DELETE', 'PUT'],
};

async function bootstrap() {
  const adapter = new FastifyAdapter({
    logger: false,
  });
  // adapter.enableCors(CORS_OPTIONS);
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  );

  app.register(cors, CORS_OPTIONS);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      exceptionFactory: (validationErrors: ValidationError[] = []) => {
        return new BadRequestException(
          validationErrors.map((error) => ({
            field: error.property,
            error: Object.values(error.constraints).join(', '),
          })),
        );
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Bomberman')
    .setDescription('Bomberman API description')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('BOMBERMAN')
    .setExternalDoc('Postman Collection', '/api-json')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  const PORT = process.env.PORT || 3000;
  await app.listen(PORT, '0.0.0.0');
}
bootstrap();

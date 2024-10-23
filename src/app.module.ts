import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SessionsModule } from './sessions/sessions.module';
import { PlayersModule } from './players/players.module';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'your-username',
      password: 'your-password',
      database: 'bomberman',
      autoLoadEntities: true,
      synchronize: true, // For development (creates tables automatically)
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env`,
    }),

    PlayersModule,
    SessionsModule,
  ],
})
export class AppModule {}

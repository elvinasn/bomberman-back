import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameGateway } from 'src/ws/game.gateway';
import { Player } from 'src/players/player.entity';
import { SessionEntity } from './session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Player, SessionEntity])],
  providers: [SessionsService, GameGateway],
  controllers: [SessionsController],
  exports: [SessionsService],
})
export class SessionsModule {}

import { Module } from '@nestjs/common';
import { PlayersService } from './players.service';
import { PlayersController } from './players.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Player } from './player.entity';
import { GameGateway } from 'src/ws/game.gateway';
import { SessionEntity } from 'src/sessions/session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Player, SessionEntity])],
  providers: [PlayersService, GameGateway],
  controllers: [PlayersController],
  exports: [PlayersService],
})
export class PlayersModule {}

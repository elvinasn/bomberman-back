import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from './player.entity';
import { MovePlayerDto } from './dto/move_player.dto';
import { GameGateway } from 'src/ws/game.gateway';

@Injectable()
export class PlayersService {
  constructor(
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
    private readonly gameGateway: GameGateway,
  ) {}

  async updatePlayerPosition(playerId: string, update: MovePlayerDto) {
    this.gameGateway.broadcastPlayerMoved(
      playerId,
      update.position_x,
      update.position_y,
    );
    const player = await this.playerRepository.findOne({
      where: { id: playerId },
    });
    if (player) {
      player.position_x = update.position_x;
      player.position_y = update.position_y;
      await this.playerRepository.save(player);
    }
    return player;
  }
}

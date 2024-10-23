import { Controller, Body, Headers, Patch } from '@nestjs/common';
import { MovePlayerDto } from './dto/move_player.dto';
import { PlayersService } from './players.service';
import { ApiTags } from '@nestjs/swagger';

@Controller('players')
@ApiTags('Players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Patch('move')
  async movePlayer(
    @Headers('player-id') playerId: string,
    @Body() movePlayerDto: MovePlayerDto,
  ) {
    return this.playersService.updatePlayerPosition(playerId, movePlayerDto);
  }
}

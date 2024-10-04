import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from 'src/firebase/firebase.service';
import { DatabaseCollection } from 'src/firebase/utils/database_collection';
import { MovePlayerDto } from './dto/move_player.dto';

@Injectable()
export class PlayersService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async movePlayer(playerId: string, movePlayerDto: MovePlayerDto) {
    const isSuccess = await this.firebaseService.updateDocument(
      {
        position_x: movePlayerDto.position_x,
        position_y: movePlayerDto.position_y,
      },
      DatabaseCollection.session_players,
      playerId,
    );
    if (!isSuccess) {
      throw new NotFoundException('Player not found');
    }
    return { status: 'success' };
  }
}

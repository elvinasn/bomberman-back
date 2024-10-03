import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from 'src/firebase/firebase.service';
import { MovePlayerDto } from './dto/move_player.dto';
import { DatabaseCollection } from 'src/firebase/utils/database_collection';

@Injectable()
export class PlayersService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async movePlayer(playerId: string, movePlayerDto: MovePlayerDto) {
    const isSuccess = await this.firebaseService.updateDocument(
      {
        positionX: movePlayerDto.positionX,
        positionY: movePlayerDto.positionY,
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

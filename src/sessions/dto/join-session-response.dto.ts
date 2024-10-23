import { Player } from 'src/players/player.entity';

export class JoinSessionResponseDto {
  session_id: string;
  player_id: string;
  players: Player[];
}

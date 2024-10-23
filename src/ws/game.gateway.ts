import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Player } from 'src/players/player.entity';

@WebSocketGateway(7777, { transports: ['websocket'] })
export class GameGateway {
  @WebSocketServer()
  server: Server;

  broadcastPlayerJoined(player: Player) {
    console.log('Player joined: ', player.username);
    console.log('player: ', player);
    this.server.emit('player_joined', {
      id: player.id,
      username: player.username,
      position_x: player.position_x,
      position_y: player.position_y,
      session_id: player.session_id,
    });
  }

  broadcastPlayerLeft(player: Player) {
    this.server.emit('player_left', {
      id: player.id,
      username: player.username,
    });
  }

  broadcastPlayerMoved(
    playerId: string,
    position_x: number,
    position_y: number,
  ) {
    this.server.emit('player_moved', {
      id: playerId,
      position_x,
      position_y,
    });
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from 'src/players/player.entity';
import { JoinSessionResponseDto } from './dto/join-session-response.dto';
import { GameState } from './game-state.enum';
import { v4 as uuidv4 } from 'uuid';
import { GameGateway } from 'src/ws/game.gateway';
import { SessionEntity } from './session.entity';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(SessionEntity)
    private sessionRepository: Repository<SessionEntity>,
    @InjectRepository(Player)
    private playerRepository: Repository<Player>,
    private readonly gameGateway: GameGateway,
  ) {}

  async joinSession(): Promise<JoinSessionResponseDto> {
    await this.cleanInactiveSessions();

    const existingSessions = await this.sessionRepository.find({
      where: { gameState: GameState.waitingForPlayers },
      relations: ['players'],
    });

    let sessionId: string;
    let players = [];

    if (existingSessions.length) {
      sessionId = existingSessions[0].id;
      players = existingSessions[0].players;
    } else {
      sessionId = uuidv4();
      const newSession = this.sessionRepository.create({
        id: sessionId,
        gameState: GameState.waitingForPlayers,
      });
      await this.sessionRepository.save(newSession);
    }

    const playerId = uuidv4();
    const player = this.playerRepository.create({
      id: playerId,
      username: 'player',
      session: { id: sessionId } as SessionEntity,
    });
    await this.playerRepository.save(player);

    this.gameGateway.broadcastPlayerJoined(player);

    return {
      player_id: playerId,
      session_id: sessionId,
      players: [...players, player],
    };
  }

  async leaveSession(playerId: string): Promise<void> {
    const player = await this.playerRepository.findOne({
      where: { id: playerId },
      relations: ['session'], // Fetch related session
    });
    if (!player) return;

    const sessionId = player.session.id;

    await this.playerRepository.delete(playerId);

    const remainingPlayers = await this.playerRepository.find({
      where: { session: { id: sessionId } },
    });
    this.gameGateway.broadcastPlayerLeft(player);

    if (remainingPlayers.length === 0) {
      await this.sessionRepository.delete(sessionId);
    }
  }

  private async cleanInactiveSessions(): Promise<void> {
    // Fetch all sessions
    const existingSessions = await this.sessionRepository.find();

    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

    for (const session of existingSessions) {
      if (session.dateCreated < twoHoursAgo) {
        await this.playerRepository.delete({ session: { id: session.id } });
        await this.sessionRepository.delete(session.id);
      }
    }
  }
}

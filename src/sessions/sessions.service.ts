import { Injectable } from '@nestjs/common';
import { FirebaseService } from 'src/firebase/firebase.service';
import { DatabaseCollection } from 'src/firebase/utils/database_collection';
import { v4 as uuidv4 } from 'uuid';
import { Session } from './session.model';
import { Player } from 'src/players/player.model';
import { JoinSessionResponseDto } from './dto/join-session-response.dto';
import { GameState } from './game-state.enum';

@Injectable()
export class SessionsService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async joinSession(): Promise<JoinSessionResponseDto> {
    await this.cleanInactiveSessions();
    const existingSessions = await this.firebaseService.getDocuments(
      new Session(),
      DatabaseCollection.sessions,
      [],
    );
    const playerId = uuidv4();

    const sessionId = existingSessions[0]?.id ?? uuidv4();
    const player = new Player({
      id: playerId,
      username: 'player',
      session_id: sessionId,
    });

    if (existingSessions.length) {
      await this.firebaseService.createDocument(
        player.toDatabaseObj(),
        DatabaseCollection.session_players,
        playerId,
      );
      return { player_id: playerId, session_id: existingSessions[0].id };
    }

    const session = new Session({
      id: sessionId,
      gameState: GameState.waitingForPlayers,
    });
    await this.firebaseService.createDocument(
      session.toDatabaseObj(),
      DatabaseCollection.sessions,
      sessionId,
    );
    await this.firebaseService.createDocument(
      player.toDatabaseObj(),
      DatabaseCollection.session_players,
      playerId,
    );

    return { session_id: sessionId, player_id: playerId };
  }

  async leaveSession(playerId: string): Promise<void> {
    const player = await this.firebaseService.getDocument(
      new Player(),
      DatabaseCollection.session_players,
      playerId,
    );
    if (!player) return;
    const sessionId = player.session_id;

    await this.firebaseService.deleteDocument(
      DatabaseCollection.session_players,
      playerId,
    );
    const players = await this.firebaseService.getDocuments(
      new Player(),
      DatabaseCollection.session_players,
      [
        {
          type: 'where',
          field: 'session_id',
          operator: '==',
          value: sessionId,
        },
      ],
    );
    if (players.length === 0) {
      await this.firebaseService.deleteDocument(
        DatabaseCollection.sessions,
        sessionId,
      );
    }
  }

  private async cleanInactiveSessions(): Promise<void> {
    const existingSessions = await this.firebaseService.getDocuments(
      new Session(),
      DatabaseCollection.sessions,
      [],
    );
    for (const session of existingSessions) {
      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
      if (session.dateCreated < twoHoursAgo) {
        await this.firebaseService.deleteDocument(
          DatabaseCollection.sessions,
          session.id,
        );
        const players = await this.firebaseService.getDocuments(
          new Player(),
          DatabaseCollection.session_players,
          [
            {
              type: 'where',
              field: 'session_id',
              operator: '==',
              value: session.id,
            },
          ],
        );
        for (const player of players) {
          await this.firebaseService.deleteDocument(
            DatabaseCollection.session_players,
            player.id,
          );
        }
      }
    }
  }
}

import { Serializable } from 'src/firebase/utils/serializable';
import { GameState } from './game-state.enum';

interface ISession {
  id: string;
  gameState: GameState;
  dateCreated: Date;
}

export class Session extends Serializable<ISession> {
  id: string = '';
  gameState: GameState = GameState.waitingForPlayers;
  dateCreated: Date = new Date();

  protected create(data?: any): Session {
    return new Session(data);
  }

  constructor(data?: Partial<ISession>) {
    super();
    if (data) Object.assign(this, data);
  }
}

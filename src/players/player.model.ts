import { Serializable } from 'src/firebase/utils/serializable';

interface IPlayer {
  id: string;
  username: string;
  session_id: string;
  positionX: number;
  positionY: number;
}

export class Player extends Serializable<IPlayer> {
  id: string = '';
  username: string = '';
  positionX: number = 0;
  positionY: number = 0;
  session_id: string = '';

  protected create(data?: any): Player {
    return new Player(data);
  }

  constructor(data?: Partial<IPlayer>) {
    super();
    if (data) Object.assign(this, data);
  }
}

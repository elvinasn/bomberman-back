import { Serializable } from 'src/firebase/utils/serializable';

interface IPlayer {
  id: string;
  username: string;
  session_id: string;
  position_x: number;
  position_y: number;
}

export class Player extends Serializable<IPlayer> {
  id: string = '';
  username: string = '';
  position_x: number = 0;
  position_y: number = 0;
  session_id: string = '';

  protected create(data?: any): Player {
    return new Player(data);
  }

  constructor(data?: Partial<IPlayer>) {
    super();
    if (data) Object.assign(this, data);
  }
}

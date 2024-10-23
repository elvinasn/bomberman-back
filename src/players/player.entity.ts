import { SessionEntity } from 'src/sessions/session.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  RelationId,
} from 'typeorm';

@Entity({
  name: 'players',
})
export class Player {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  username: string;

  @Column({ type: 'int', default: 0 })
  position_x: number;

  @Column({ type: 'int', default: 0 })
  position_y: number;

  @ManyToOne(() => SessionEntity, (session) => session.players)
  session: SessionEntity;

  @RelationId((player: Player) => player.session)
  session_id: string;
}

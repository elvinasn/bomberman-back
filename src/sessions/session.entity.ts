import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { GameState } from './game-state.enum';
import { Player } from 'src/players/player.entity';

@Entity({
  name: 'sessions',
})
export class SessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: GameState,
    default: GameState.waitingForPlayers,
  })
  gameState: GameState;

  @OneToMany(() => Player, (player) => player.session, { cascade: true })
  players: Player[];

  @CreateDateColumn({ type: 'timestamptz' })
  dateCreated: Date;
}

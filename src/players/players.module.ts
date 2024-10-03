import { Module } from '@nestjs/common';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { PlayersService } from './players.service';
import { PlayersController } from './players.controller';

@Module({
  imports: [FirebaseModule],
  providers: [PlayersService],
  controllers: [PlayersController],
  exports: [PlayersService],
})
export class PlayersModule {}

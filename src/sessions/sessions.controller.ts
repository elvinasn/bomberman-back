import { Controller, Post, Headers } from '@nestjs/common';
import { JoinSessionResponseDto } from './dto/join-session-response.dto';
import { ApiTags } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';

@Controller('sessions')
@ApiTags('Sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post('join')
  async joinSession(): Promise<JoinSessionResponseDto> {
    return this.sessionsService.joinSession();
  }

  @Post('leave')
  async leaveSession(@Headers('player-id') playerId: string) {
    return this.sessionsService.leaveSession(playerId);
  }
}

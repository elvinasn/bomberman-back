import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class MovePlayerDto {
  @ApiProperty()
  @IsInt()
  position_x: number;

  @ApiProperty()
  @IsInt()
  position_y: number;
}

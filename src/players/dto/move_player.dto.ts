import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class MovePlayerDto {
  @ApiProperty()
  @IsInt()
  positionX: number;

  @ApiProperty()
  @IsInt()
  positionY: number;
}

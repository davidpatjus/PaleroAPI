import { IsUUID, IsEnum, IsOptional, IsArray } from 'class-validator';
import { participantRoleEnum } from 'src/db/schema';

export class AddParticipantDto {
  @IsUUID('4', { each: true })
  @IsArray()
  userIds: string[];

  @IsEnum(participantRoleEnum.enumValues)
  @IsOptional()
  role?: (typeof participantRoleEnum.enumValues)[number];
}

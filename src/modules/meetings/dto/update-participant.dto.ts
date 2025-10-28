import { IsEnum, IsOptional } from 'class-validator';
import { participantRoleEnum, participantStatusEnum } from 'src/db/schema';

export class UpdateParticipantDto {
  @IsEnum(participantRoleEnum.enumValues)
  @IsOptional()
  role?: (typeof participantRoleEnum.enumValues)[number];

  @IsEnum(participantStatusEnum.enumValues)
  @IsOptional()
  status?: (typeof participantStatusEnum.enumValues)[number];
}

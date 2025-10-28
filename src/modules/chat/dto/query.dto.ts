import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';

export class GetConversationsDto {
  @IsOptional()
  @IsString({ message: 'La página debe ser un número' })
  page?: string;

  @IsOptional()
  @IsString({ message: 'El límite debe ser un número' })
  limit?: string;
}

export class GetMessagesDto {
  @IsOptional()
  @IsUUID('4', { message: 'El ID de la conversación debe ser un UUID válido' })
  conversationId?: string;

  @IsOptional()
  @IsString({ message: 'La página debe ser un número' })
  page?: string;

  @IsOptional()
  @IsString({ message: 'El límite debe ser un número' })
  limit?: string;

  @IsOptional()
  @IsString({ message: 'El cursor debe ser un UUID válido' })
  cursor?: string;
}

export class UpdateTypingStatusDto {
  @IsNotEmpty({ message: 'El ID de la conversación es requerido' })
  @IsUUID('4', { message: 'El ID de la conversación debe ser un UUID válido' })
  conversationId: string;

  @IsNotEmpty({ message: 'El estado de escritura es requerido' })
  @IsBoolean({ message: 'El estado de escritura debe ser verdadero o falso' })
  isTyping: boolean;
}

export class GetSupabaseTokenDto {
  @IsOptional()
  @IsEnum(['chat', 'presence'], {
    message: 'El tipo debe ser chat o presence',
  })
  type?: 'chat' | 'presence';
}

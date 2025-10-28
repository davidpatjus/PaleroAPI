import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateConversationDto {
  @IsNotEmpty({ message: 'El ID del destinatario es requerido' })
  @IsUUID('4', { message: 'El ID del destinatario debe ser un UUID válido' })
  recipientId: string;

  @IsOptional()
  @IsString({ message: 'El mensaje inicial debe ser un texto' })
  @MinLength(1, { message: 'El mensaje inicial no puede estar vacío' })
  @MaxLength(1000, {
    message: 'El mensaje inicial no puede exceder 1000 caracteres',
  })
  initialMessage?: string;
}

export class SendMessageDto {
  @IsNotEmpty({ message: 'El ID de la conversación es requerido' })
  @IsUUID('4', { message: 'El ID de la conversación debe ser un UUID válido' })
  conversationId: string;

  @IsNotEmpty({ message: 'El contenido del mensaje es requerido' })
  @IsString({ message: 'El contenido debe ser un texto' })
  @MinLength(1, { message: 'El mensaje no puede estar vacío' })
  @MaxLength(2000, { message: 'El mensaje no puede exceder 2000 caracteres' })
  content: string;
}

export class MarkAsReadDto {
  @IsNotEmpty({ message: 'El ID de la conversación es requerido' })
  @IsUUID('4', { message: 'El ID de la conversación debe ser un UUID válido' })
  conversationId: string;

  @IsOptional()
  @IsUUID('4', {
    each: true,
    message: 'Cada ID de mensaje debe ser un UUID válido',
  })
  messageIds?: string[];
}

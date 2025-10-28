import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { CreateInvoiceItemDto } from './create-invoice-item.dto';

export class CreateInvoiceDto {
  @IsUUID('4', { message: 'El ID del cliente debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'El ID del cliente no puede estar vacío.' })
  clientId: string;

  @IsUUID('4', { message: 'El ID del proyecto debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'El ID del proyecto no puede estar vacío.' })
  projectId: string;

  @IsDateString(
    {},
    { message: 'La fecha de emisión debe ser una fecha válida.' },
  )
  @IsNotEmpty({ message: 'La fecha de emisión no puede estar vacía.' })
  issueDate: string;

  @IsDateString(
    {},
    { message: 'La fecha de vencimiento debe ser una fecha válida.' },
  )
  @IsNotEmpty({ message: 'La fecha de vencimiento no puede estar vacía.' })
  dueDate: string;

  @IsString({ message: 'Las notas deben ser un texto.' })
  @IsOptional()
  notes?: string;

  @IsNumber({}, { message: 'Los impuestos deben ser un número.' })
  @Min(0, { message: 'Los impuestos no pueden ser negativos.' })
  @Max(100, { message: 'Los impuestos no pueden ser mayores al 100%.' })
  @IsOptional()
  taxes?: number = 0;

  @IsString()
  @IsOptional()
  status?: 'DRAFT' | 'SENT' | 'PAID' | 'VOID';

  @IsArray({ message: 'Los ítems de la factura deben ser un arreglo.' })
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];
}

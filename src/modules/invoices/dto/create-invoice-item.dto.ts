import { IsNotEmpty, IsString, IsDecimal } from 'class-validator';

export class CreateInvoiceItemDto {
  @IsString({ message: 'La descripción debe ser un texto.' })
  @IsNotEmpty({ message: 'La descripción no puede estar vacía.' })
  description: string;

  @IsDecimal({}, { message: 'La cantidad debe ser un número decimal válido.' })
  @IsNotEmpty({ message: 'La cantidad no puede estar vacía.' })
  quantity: string;

  @IsDecimal(
    {},
    { message: 'El precio unitario debe ser un número decimal válido.' },
  )
  @IsNotEmpty({ message: 'El precio unitario no puede estar vacío.' })
  unitPrice: string;
}

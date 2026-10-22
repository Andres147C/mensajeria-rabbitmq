import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Quita espacios al inicio y al final si el valor es texto. */
const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Datos que envía el frontend al redactar un correo (POST /api/correos).
 */
export class CrearCorreoDto {
  @Transform(recortar)
  @IsEmail({}, { message: 'El destinatario debe ser un correo electrónico válido' })
  @MaxLength(320)
  para: string;

  @Transform(recortar)
  @IsString()
  @IsNotEmpty({ message: 'El asunto es obligatorio' })
  @MaxLength(200, { message: 'El asunto no puede superar los 200 caracteres' })
  asunto: string;

  @IsString()
  @IsNotEmpty({ message: 'El mensaje es obligatorio' })
  @MaxLength(20000, { message: 'El mensaje no puede superar los 20000 caracteres' })
  mensaje: string;
}

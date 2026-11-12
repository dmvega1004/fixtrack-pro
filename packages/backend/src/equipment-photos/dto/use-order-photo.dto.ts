import { IsUUID } from 'class-validator';

/** POST /equipments/:equipmentId/photos/from-order-photo */
export class UseOrderPhotoDto {
  /** Attachment.id de la foto de la orden que se copia como portada. */
  @IsUUID('4', { message: 'attachmentId debe ser un UUID válido' })
  attachmentId: string;
}

import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

/** Erreurs métier : un code stable pour les applis, un message en français pour l'écran. */
export const forbidden = (code: string, message: string) =>
  new ForbiddenException({ code, message });
export const notFound = (message = 'Introuvable.') =>
  new NotFoundException({ code: 'not_found', message });
export const conflict = (code: string, message: string) =>
  new ConflictException({ code, message });
export const badRequest = (code: string, message: string) =>
  new BadRequestException({ code, message });

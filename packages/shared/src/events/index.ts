import { z } from 'zod';

export const EVENT_EXCHANGE = 'losrobles.events';
export const EventTypes = [
  'usuario.registrado.v1',
  'reserva.creada.v1',
  'reserva.cancelada.v1',
  'reserva.recordatorio.v1',
  'alquiler.vencido.v1',
] as const;
export type EventType = (typeof EventTypes)[number];

const fecha = z.iso.datetime({ offset: true });
const id = z.int().positive();
const correo = z.email();

export const EventEnvelopeSchema = z
  .object({
    id: z.uuid(),
    tipo: z.string().min(1),
    version: z.number().int().min(1),
    ocurridoEn: fecha,
    correlationId: z.string().min(1),
    datos: z.unknown(),
  })
  .refine((event) => Object.hasOwn(event, 'datos'), {
    path: ['datos'],
    message: 'Se requieren los datos del evento.',
  });
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

export const UsuarioRegistradoDatosSchema = z.object({
  idUsuario: id,
  nombre: z.string().min(1),
  correo,
});
export const ReservaCreadaDatosSchema = z.object({
  idReserva: id,
  cancha: z.string().min(1),
  inicio: fecha,
  fin: fecha,
  valor: z.number().nonnegative(),
  destinatario: correo,
});
export const ReservaCanceladaDatosSchema = z.object({
  idReserva: id,
  canceladaPor: id,
  motivo: z.string(),
  destinatario: correo,
});
export const ReservaRecordatorioDatosSchema = z.object({
  idReserva: id,
  inicio: fecha,
  destinatario: correo,
});
export const AlquilerVencidoDatosSchema = z.object({
  idAlquiler: id,
  implemento: z.string().min(1),
  destinatario: correo,
});

export const EventDataSchemas = {
  'usuario.registrado.v1': UsuarioRegistradoDatosSchema,
  'reserva.creada.v1': ReservaCreadaDatosSchema,
  'reserva.cancelada.v1': ReservaCanceladaDatosSchema,
  'reserva.recordatorio.v1': ReservaRecordatorioDatosSchema,
  'alquiler.vencido.v1': AlquilerVencidoDatosSchema,
} satisfies Record<EventType, z.ZodType>;

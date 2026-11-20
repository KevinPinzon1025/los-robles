import { z } from 'zod';

export const Rol = z.enum(['CLIENTE', 'ADMIN']);
export type Rol = z.infer<typeof Rol>;

export const EstadoUsuario = z.enum(['ACTIVO', 'INACTIVO']);
export type EstadoUsuario = z.infer<typeof EstadoUsuario>;

export const EstadoCancha = z.enum(['ACTIVA', 'INACTIVA', 'MANTENIMIENTO']);
export type EstadoCancha = z.infer<typeof EstadoCancha>;

export const EstadoReserva = z.enum(['PROGRAMADA', 'CANCELADA', 'CUMPLIDA']);
export type EstadoReserva = z.infer<typeof EstadoReserva>;

export const TipoReserva = z.enum(['CLIENTE', 'TERCERO']);
export type TipoReserva = z.infer<typeof TipoReserva>;

export const EstadoAlquiler = z.enum(['ACTIVO', 'DEVUELTO', 'VENCIDO']);
export type EstadoAlquiler = z.infer<typeof EstadoAlquiler>;

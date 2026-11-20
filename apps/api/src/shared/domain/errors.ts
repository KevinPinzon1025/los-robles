export abstract class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown[],
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  constructor(message = 'Los datos de la solicitud no son válidos.', details?: unknown[]) {
    super('VALIDATION_ERROR', message, details);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Se requiere autenticación.') {
    super('UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'No tienes permisos para esta operación.') {
    super('FORBIDDEN', message);
  }
}

export class NotFoundError extends DomainError {
  constructor(message = 'No se encontró el recurso solicitado.') {
    super('NOT_FOUND', message);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, code = 'CONFLICT') {
    super(code, message);
  }
}

export class BusinessRuleError extends DomainError {
  constructor(message: string, code = 'BUSINESS_RULE_VIOLATION') {
    super(code, message);
  }
}

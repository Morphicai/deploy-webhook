import { DeployResponse } from '../types';

export interface NormalizedError {
  code: number;
  message: string;
  stack?: string;
}

/**
 * Base error class with HTTP status code
 */
export class HttpError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request - validation errors, malformed requests
 */
export class ValidationError extends HttpError {
  constructor(message: string) {
    super(message, 400);
  }
}

/**
 * 404 Not Found
 */
export class NotFoundError extends HttpError {
  constructor(message: string) {
    super(message, 404);
  }
}

/**
 * 409 Conflict - duplicate resources, constraint violations
 */
export class ConflictError extends HttpError {
  constructor(message: string) {
    super(message, 409);
  }
}

export function extractErrorCode(error: unknown): number {
  if (!error || typeof error !== 'object') {
    return 500;
  }

  const candidate = (error as { status?: unknown; statusCode?: unknown; code?: unknown }) || {};
  const codes: Array<unknown> = [candidate.statusCode, candidate.status, candidate.code];

  for (const value of codes) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    const parsed = typeof value === 'string' ? Number(value) : NaN;
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 500;
}

export function normalizeError(error: unknown): NormalizedError {
  if (error instanceof Error) {
    return {
      code: extractErrorCode(error),
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === 'string') {
    return { code: 500, message: error };
  }

  try {
    const serialized = JSON.stringify(error);
    return { code: extractErrorCode(error), message: serialized };
  } catch {
    return { code: 500, message: 'Unknown error' };
  }
}

export function buildErrorResponse(error: unknown, overrides: Partial<DeployResponse> = {}): DeployResponse {
  const normalized = normalizeError(error);
  const code = typeof overrides.code === 'number' && Number.isFinite(overrides.code)
    ? overrides.code
    : (Number.isFinite(normalized.code) ? normalized.code : 500);
  return {
    success: false,
    code,
    error: normalized.message,
    stderr: normalized.stack,
    ...overrides,
  };
}

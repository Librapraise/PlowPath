export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new HttpError(400, 'bad_request', message, details);
  }
  static unauthorized(message = 'Unauthorized') {
    return new HttpError(401, 'unauthorized', message);
  }
  static forbidden(message = 'Forbidden') {
    return new HttpError(403, 'forbidden', message);
  }
  static notFound(message = 'Not found') {
    return new HttpError(404, 'not_found', message);
  }
  static conflict(message: string) {
    return new HttpError(409, 'conflict', message);
  }
}

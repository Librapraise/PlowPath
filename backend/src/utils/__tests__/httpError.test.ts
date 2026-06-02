import { HttpError } from '../httpError';

describe('HttpError', () => {
  it('should create an instance with correct values', () => {
    const err = new HttpError(418, 'im_a_teapot', 'Teapot message', { detail: 'extra' });
    expect(err.status).toBe(418);
    expect(err.code).toBe('im_a_teapot');
    expect(err.message).toBe('Teapot message');
    expect(err.details).toEqual({ detail: 'extra' });
    expect(err.name).toBe('HttpError');
  });

  it('should construct badRequest error', () => {
    const err = HttpError.badRequest('bad request message', 'some details');
    expect(err.status).toBe(400);
    expect(err.code).toBe('bad_request');
    expect(err.message).toBe('bad request message');
    expect(err.details).toBe('some details');
  });

  it('should construct unauthorized error with default message', () => {
    const err = HttpError.unauthorized();
    expect(err.status).toBe(401);
    expect(err.code).toBe('unauthorized');
    expect(err.message).toBe('Unauthorized');
  });

  it('should construct unauthorized error with custom message', () => {
    const err = HttpError.unauthorized('Custom unauthorized');
    expect(err.message).toBe('Custom unauthorized');
  });

  it('should construct forbidden error with default message', () => {
    const err = HttpError.forbidden();
    expect(err.status).toBe(403);
    expect(err.code).toBe('forbidden');
    expect(err.message).toBe('Forbidden');
  });

  it('should construct forbidden error with custom message', () => {
    const err = HttpError.forbidden('Custom forbidden');
    expect(err.message).toBe('Custom forbidden');
  });

  it('should construct notFound error with default message', () => {
    const err = HttpError.notFound();
    expect(err.status).toBe(404);
    expect(err.code).toBe('not_found');
    expect(err.message).toBe('Not found');
  });

  it('should construct notFound error with custom message', () => {
    const err = HttpError.notFound('Custom not found');
    expect(err.message).toBe('Custom not found');
  });

  it('should construct conflict error', () => {
    const err = HttpError.conflict('conflict message');
    expect(err.status).toBe(409);
    expect(err.code).toBe('conflict');
    expect(err.message).toBe('conflict message');
  });
});

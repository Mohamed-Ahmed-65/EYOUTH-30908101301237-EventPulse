const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');

describe('AppError', () => {
  it('sets statusCode, message, and operational flag', () => {
    const err = new AppError('Nope', 404);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Nope');
    expect(err.statusCode).toBe(404);
    expect(err.status).toBe('fail');
    expect(err.isOperational).toBe(true);
  });

  it('defaults to 500 and error status for server failures', () => {
    const err = new AppError('boom');
    expect(err.statusCode).toBe(500);
    expect(err.status).toBe('error');
  });
});

describe('asyncHandler', () => {
  it('forwards rejected promises to next', async () => {
    const boom = new Error('async fail');
    const handler = asyncHandler(async () => {
      throw boom;
    });
    const next = jest.fn();
    await handler({}, {}, next);
    expect(next).toHaveBeenCalledWith(boom);
  });

  it('does not call next when the handler resolves', async () => {
    const handler = asyncHandler(async (req, res) => {
      res.called = true;
    });
    const next = jest.fn();
    const res = {};
    await handler({}, res, next);
    expect(res.called).toBe(true);
    expect(next).not.toHaveBeenCalled();
  });
});

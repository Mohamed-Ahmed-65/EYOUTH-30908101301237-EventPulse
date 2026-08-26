const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

function handleValidation(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map((item) => ({
    field: item.path,
    message: item.msg,
  }));

  return res.status(422).json({
    status: 'fail',
    message: 'Validation failed',
    errors,
  });
}

function mapMongooseError(err) {
  if (err.name === 'CastError') {
    return new AppError(`Invalid ${err.path}: ${err.value}`, 404);
  }

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join('. ');
    return new AppError(message, 422);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return new AppError(`A record with that ${field} already exists.`, 409);
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return new AppError('Invalid or expired token.', 401);
  }

  return err;
}

function errorHandler(err, req, res, next) {
  const mapped = mapMongooseError(err);
  const statusCode = mapped.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';
  const isOperational = mapped.isOperational === true;

  const payload = {
    status: mapped.status || (String(statusCode).startsWith('4') ? 'fail' : 'error'),
    message:
      isProd && !isOperational && statusCode === 500
        ? 'Something went wrong'
        : mapped.message || 'Something went wrong',
  };

  if (!isProd) {
    payload.stack = mapped.stack;
  }

  res.status(statusCode).json(payload);
}

function notFound(req, res, next) {
  next(new AppError(`Cannot ${req.method} ${req.originalUrl}`, 404));
}

module.exports = { handleValidation, errorHandler, notFound };

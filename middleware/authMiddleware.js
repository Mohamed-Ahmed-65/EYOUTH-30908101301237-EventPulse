const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError('Authentication required. Provide a Bearer token.', 401);
  }

  const token = header.slice(7).trim();
  if (!token) {
    throw new AppError('Authentication required. Provide a Bearer token.', 401);
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new AppError('Invalid or expired token.', 401);
  }

  const userId = payload.userId || payload.id;
  const user = await User.findById(userId).select('-password');
  if (!user) {
    throw new AppError('Invalid or expired token.', 401);
  }

  req.user = user;
  next();
});

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required. Provide a Bearer token.', 401));
    }
    if (req.user.role !== role) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };

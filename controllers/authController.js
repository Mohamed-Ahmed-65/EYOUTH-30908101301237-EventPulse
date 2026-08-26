const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

function signToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

const register = asyncHandler(async (req, res) => {
  const email = req.body.email.trim().toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError('An account with that email is already registered.', 409);
  }

  const user = await User.create({
    email,
    password: req.body.password,
    role: 'attendee',
  });

  const token = signToken(user);
  res.status(201).json({
    status: 'success',
    token,
    user: user.toJSON(),
  });
});

const login = asyncHandler(async (req, res) => {
  const email = req.body.email.trim().toLowerCase();
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(req.body.password))) {
    throw new AppError('Invalid email or password.', 401);
  }

  const token = signToken(user);
  const safeUser = user.toJSON();
  res.status(200).json({
    status: 'success',
    token,
    user: safeUser,
  });
});

module.exports = { register, login };

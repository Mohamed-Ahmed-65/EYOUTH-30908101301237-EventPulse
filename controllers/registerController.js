const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const createRegistration = asyncHandler(async (req, res) => {
  const { eventId } = req.body;
  const userId = req.user._id;

  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  const already = await Registration.findOne({ user: userId, event: eventId });
  if (already) {
    throw new AppError('You are already registered for this event.', 409);
  }

  // Atomic occupancy check so two attendees cannot take the last seat together.
  const reserved = await Event.findOneAndUpdate(
    {
      _id: eventId,
      $expr: { $lt: ['$registrationCount', '$capacity'] },
    },
    { $inc: { registrationCount: 1 } },
    { new: true }
  );

  if (!reserved) {
    throw new AppError('This event is full.', 409);
  }

  try {
    const registration = await Registration.create({
      user: userId,
      event: eventId,
    });
    await registration.populate({ path: 'event', populate: { path: 'category' } });
    res.status(201).json({ status: 'success', registration });
  } catch (err) {
    await Event.findByIdAndUpdate(eventId, { $inc: { registrationCount: -1 } });
    if (err.code === 11000) {
      throw new AppError('You are already registered for this event.', 409);
    }
    throw err;
  }
});

const listRegistrations = asyncHandler(async (req, res) => {
  const registrations = await Registration.find({ user: req.user._id })
    .populate({ path: 'event', populate: { path: 'category' } })
    .sort({ registeredAt: -1 });

  res.status(200).json({ status: 'success', registrations });
});

const cancelRegistration = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new AppError('Registration not found', 404);
  }

  const registration = await Registration.findById(req.params.id);
  if (!registration) {
    throw new AppError('Registration not found', 404);
  }

  if (registration.user.toString() !== req.user._id.toString()) {
    throw new AppError('You can only cancel your own registration.', 403);
  }

  await registration.deleteOne();
  await Event.findByIdAndUpdate(registration.event, {
    $inc: { registrationCount: -1 },
  });

  res.status(200).json({ status: 'success', message: 'Registration cancelled' });
});

module.exports = {
  createRegistration,
  listRegistrations,
  cancelRegistration,
};

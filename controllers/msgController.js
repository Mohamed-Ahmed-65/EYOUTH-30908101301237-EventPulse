const mongoose = require('mongoose');
const Event = require('../models/Event');
const Message = require('../models/Message');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const getAnnouncements = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new AppError('Event not found', 404);
  }

  const event = await Event.findById(req.params.id);
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  const announcements = await Message.find({ event: event._id })
    .populate('sender', 'email role')
    .sort({ createdAt: 1 });

  res.status(200).json({ status: 'success', announcements });
});

module.exports = { getAnnouncements };

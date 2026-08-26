const mongoose = require('mongoose');
const Event = require('../models/Event');
const Category = require('../models/Category');
const Registration = require('../models/Registration');
const Message = require('../models/Message');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parsePositiveInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function buildEventFilter(query) {
  const filter = {};

  if (query.category) {
    if (!mongoose.isValidObjectId(query.category)) {
      throw new AppError('Invalid category id', 422);
    }
    filter.category = query.category;
  }

  if (query.city) {
    filter.city = new RegExp(`^${escapeRegex(query.city)}$`, 'i');
  }

  if (query.startDate || query.endDate) {
    filter.date = {};
    if (query.startDate) {
      const start = new Date(query.startDate);
      if (Number.isNaN(start.getTime())) throw new AppError('Invalid startDate', 422);
      filter.date.$gte = start;
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      if (Number.isNaN(end.getTime())) throw new AppError('Invalid endDate', 422);
      filter.date.$lte = end;
    }
  }

  if (query.search) {
    filter.$text = { $search: String(query.search) };
  }

  return filter;
}

function sortSpec(sort, hasTextSearch) {
  if (sort === 'popularity') {
    return { registrationCount: -1, date: 1 };
  }
  if (sort === 'date' || !hasTextSearch) {
    return { date: 1 };
  }
  return { score: { $meta: 'textScore' } };
}

const createEvent = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.body.category);
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  const event = await Event.create({
    name: req.body.name,
    description: req.body.description,
    date: req.body.date,
    city: req.body.city,
    capacity: req.body.capacity,
    category: req.body.category,
  });

  await event.populate('category');
  res.status(201).json({ status: 'success', event });
});

const listEvents = asyncHandler(async (req, res) => {
  const filter = buildEventFilter(req.query);
  const page = parsePositiveInt(req.query.page, 1);
  const limit = Math.min(parsePositiveInt(req.query.limit, 10), 100);
  const skip = (page - 1) * limit;
  const hasTextSearch = Boolean(filter.$text);
  const sort = sortSpec(req.query.sort, hasTextSearch);

  const query = Event.find(filter).populate('category');
  if (hasTextSearch) {
    query.select({ score: { $meta: 'textScore' } });
  }

  const [events, totalEvents] = await Promise.all([
    query.sort(sort).skip(skip).limit(limit),
    Event.countDocuments(filter),
  ]);

  res.status(200).json({
    status: 'success',
    events,
    meta: {
      totalEvents,
      currentPage: page,
      totalPages: totalEvents === 0 ? 0 : Math.ceil(totalEvents / limit),
      limit,
    },
  });
});

const getEvent = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new AppError('Event not found', 404);
  }

  const event = await Event.findById(req.params.id).populate('category');
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  res.status(200).json({ status: 'success', event });
});

const updateEvent = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new AppError('Event not found', 404);
  }

  if (req.body.category) {
    const category = await Category.findById(req.body.category);
    if (!category) throw new AppError('Category not found', 404);
  }

  const allowed = ['name', 'description', 'date', 'city', 'capacity', 'category'];
  const patch = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) patch[key] = req.body[key];
  }

  const event = await Event.findByIdAndUpdate(req.params.id, patch, {
    new: true,
    runValidators: true,
  }).populate('category');

  if (!event) {
    throw new AppError('Event not found', 404);
  }

  res.status(200).json({ status: 'success', event });
});

const deleteEvent = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new AppError('Event not found', 404);
  }

  const event = await Event.findByIdAndDelete(req.params.id);
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  await Promise.all([
    Registration.deleteMany({ event: event._id }),
    Message.deleteMany({ event: event._id }),
  ]);

  res.status(200).json({ status: 'success', message: 'Event deleted' });
});

module.exports = {
  createEvent,
  listEvents,
  getEvent,
  updateEvent,
  deleteEvent,
};

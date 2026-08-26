const express = require('express');
const {
  createEvent,
  listEvents,
  getEvent,
  updateEvent,
  deleteEvent,
} = require('../controllers/eventController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { eventRules, eventUpdateRules } = require('../utils/validators');
const { handleValidation } = require('../middleware/errorMiddleware');

const router = express.Router();

router.get('/', listEvents);
router.get('/:id', getEvent);

router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  eventRules,
  handleValidation,
  createEvent
);

router.put(
  '/:id',
  requireAuth,
  requireRole('admin'),
  eventUpdateRules,
  handleValidation,
  updateEvent
);

router.delete('/:id', requireAuth, requireRole('admin'), deleteEvent);

module.exports = router;

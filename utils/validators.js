const { body } = require('express-validator');

const registerRules = [
  body('email').trim().normalizeEmail().isEmail().withMessage('A valid email is required'),
  body('password')
    .isString()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
];

const loginRules = [
  body('email').trim().normalizeEmail().isEmail().withMessage('A valid email is required'),
  body('password').isString().notEmpty().withMessage('Password is required'),
];

const eventRules = [
  body('name').trim().escape().notEmpty().withMessage('Event name is required'),
  body('description').trim().escape().notEmpty().withMessage('Description is required'),
  body('date').isISO8601().withMessage('Date must be a valid ISO 8601 datetime'),
  body('city').trim().escape().notEmpty().withMessage('City is required'),
  body('capacity')
    .isInt({ min: 1 })
    .withMessage('Capacity must be a positive integer')
    .toInt(),
  body('category').isMongoId().withMessage('A valid category id is required'),
];

const eventUpdateRules = [
  body('name').optional().trim().escape().notEmpty().withMessage('Event name cannot be empty'),
  body('description').optional().trim().escape().notEmpty().withMessage('Description cannot be empty'),
  body('date').optional().isISO8601().withMessage('Date must be a valid ISO 8601 datetime'),
  body('city').optional().trim().escape().notEmpty().withMessage('City cannot be empty'),
  body('capacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Capacity must be a positive integer')
    .toInt(),
  body('category').optional().isMongoId().withMessage('A valid category id is required'),
];

const registrationRules = [
  body('eventId').isMongoId().withMessage('A valid eventId is required'),
];

module.exports = {
  registerRules,
  loginRules,
  eventRules,
  eventUpdateRules,
  registrationRules,
};

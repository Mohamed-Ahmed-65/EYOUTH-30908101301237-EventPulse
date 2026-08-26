const express = require('express');
const {
  createRegistration,
  listRegistrations,
  cancelRegistration,
} = require('../controllers/registerController');
const { requireAuth } = require('../middleware/authMiddleware');
const { registrationRules } = require('../utils/validators');
const { handleValidation } = require('../middleware/errorMiddleware');

const router = express.Router();

router.use(requireAuth);

router.post('/', registrationRules, handleValidation, createRegistration);
router.get('/', listRegistrations);
router.delete('/:id', cancelRegistration);

module.exports = router;

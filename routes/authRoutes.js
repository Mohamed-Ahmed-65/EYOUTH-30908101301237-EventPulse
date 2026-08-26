const express = require('express');
const { register, login } = require('../controllers/authController');
const { registerRules, loginRules } = require('../utils/validators');
const { handleValidation } = require('../middleware/errorMiddleware');

const router = express.Router();

router.post('/register', registerRules, handleValidation, register);
router.post('/login', loginRules, handleValidation, login);

module.exports = router;

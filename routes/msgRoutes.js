const express = require('express');
const { getAnnouncements } = require('../controllers/msgController');

const router = express.Router();

router.get('/:id/announcements', getAnnouncements);

module.exports = router;

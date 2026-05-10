const express = require('express');
const router = express.Router();
const { getInbox } = require('../controllers/linkController');
const { authMiddleware } = require('../middleware/auth');

router.get('/inbox', authMiddleware, getInbox);

module.exports = router;

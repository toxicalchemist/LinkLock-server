const express = require('express');
const router = express.Router();
const { register, login, verifyToken } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.get('/verify', verifyToken);

module.exports = router;

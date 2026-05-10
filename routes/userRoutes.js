const express = require('express');
const router = express.Router();
const { getMyVaults } = require('../controllers/vaultController');
const { authMiddleware } = require('../middleware/auth');

router.get('/vaults', authMiddleware, getMyVaults);

module.exports = router;

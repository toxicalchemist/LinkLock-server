const express = require('express');
const router = express.Router();
const { 
    getOverview, 
    getUsers, 
    deactivateUser, 
    clearLegacyLogs, 
    getSettings, 
    updateSettings, 
    exportLogs 
} = require('../controllers/adminController');
const { authMiddleware } = require('../middleware/auth');

// All admin routes should be protected
router.use(authMiddleware);

router.get('/overview', getOverview);
router.get('/users', getUsers);
router.post('/users/:userId/toggle', deactivateUser);
router.post('/logs/clear', clearLegacyLogs);
router.get('/settings', getSettings);
router.post('/settings', updateSettings);
router.get('/logs/export', exportLogs);

module.exports = router;

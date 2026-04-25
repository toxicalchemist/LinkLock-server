const Secret = require('../models/Secret');
const SystemLog = require('../models/SystemLog');

const getOverview = async (req, res) => {
    try {
        const activeSecretsCount = await Secret.countDocuments({});
        const burnedInstancesCount = await SystemLog.countDocuments({});
        const recentLogs = await SystemLog.find({}).sort({ timestamp: -1 }).limit(20);

        res.json({
            activeSecrets: activeSecretsCount,
            burnedInstances: burnedInstancesCount,
            logs: recentLogs
        });
    } catch (error) {
        console.error('Error fetching admin overview:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const clearLegacyLogs = async (req, res) => {
    try {
        await SystemLog.deleteMany({
            $or: [
                { eventType: null },
                { secretKey: null },
                { secretKey: { $exists: false } }
            ]
        });
        res.json({ message: 'Legacy logs cleared successfully' });
    } catch (error) {
        console.error('Error clearing legacy logs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getOverview,
    clearLegacyLogs
};

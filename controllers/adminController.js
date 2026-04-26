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
        const db = SystemLog.collection;

        // Fetch logs that might be missing the strict fields
        const legacyLogs = await db.find({
            $or: [
                { eventType: { $exists: false } },
                { secretKey: { $exists: false } },
                { eventType: null },
                { secretKey: null }
            ]
        }).toArray();

        // Safely migrate the valid legacy fields to strict schema fields
        for (const log of legacyLogs) {
            const eventType = log.eventType || log.event || 'SYSTEM_ACTION';
            let secretKey = log.secretKey || log.linkId || log.targetId;
            if (!secretKey && log.documentKey && log.documentKey._id) {
                secretKey = log.documentKey._id;
            }
            const details = log.details || log.reason || 'Automatic Data Scrub';

            if (secretKey) {
                // It's a valid legacy log, migrate it
                await db.updateOne(
                    { _id: log._id },
                    { 
                        $set: { eventType, secretKey, details },
                        $unset: { event: "", linkId: "", targetId: "", documentKey: "", reason: "" }
                    }
                );
            }
        }

        // Delete only the truly unrecoverable/malformed logs
        await SystemLog.deleteMany({
            $or: [
                { eventType: null },
                { secretKey: null },
                { secretKey: { $exists: false } },
                { eventType: { $exists: false } }
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

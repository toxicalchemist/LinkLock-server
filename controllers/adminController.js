const User = require('../models/User');
const Secret = require('../models/Secret');
const SystemLog = require('../models/SystemLog');
const Settings = require('../models/Settings');

const getOverview = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({});
        const activeSecrets = await Secret.countDocuments({ status: 'Live' });
        const totalPurged = await Secret.countDocuments({ status: 'Burned' });
        
        // Real time-series data for the last 24 hours
        const now = new Date();
        const chartData = [];
        for (let i = 24; i >= 0; i -= 4) {
            const time = new Date(now.getTime() - i * 60 * 60 * 1000);
            const nextTime = new Date(now.getTime() - (i - 4) * 60 * 60 * 1000);
            
            // Format time for frontend (e.g., "08:00")
            const timeStr = time.getHours().toString().padStart(2, '0') + ':00';
            
            const count = await Secret.countDocuments({
                createdAt: { $gte: time, $lt: i === 0 ? now : nextTime }
            });
            
            chartData.push({ time: timeStr, links: count });
        }

        const recentLogs = await SystemLog.find({}).sort({ timestamp: -1 }).limit(10);

        res.json({
            totalUsers,
            activeSecrets,
            totalPurged,
            chartData,
            logs: recentLogs
        });
    } catch (error) {
        console.error('Error fetching admin overview:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password').lean();
        
        // Add secret counts for each user
        const usersWithStats = await Promise.all(users.map(async (user) => {
            const secretCount = await Secret.countDocuments({ creatorId: user._id });
            return {
                ...user,
                secretCount
            };
        }));
        
        res.json(usersWithStats);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deactivateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        user.isActive = !user.isActive; // Toggle status
        await user.save();
        
        res.json({ message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`, user });
    } catch (error) {
        console.error('Error deactivating user:', error);
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

const getSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne({});
        if (!settings) {
            settings = await Settings.create({});
        }
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateSettings = async (req, res) => {
    try {
        const { maintenanceMode, globalMaxExpiry, enforce2FA, retentionPeriod, companyIpRange } = req.body;
        let settings = await Settings.findOne({});
        if (!settings) {
            settings = await Settings.create({});
        }
        
        if (maintenanceMode !== undefined) settings.maintenanceMode = maintenanceMode;
        if (globalMaxExpiry !== undefined) settings.globalMaxExpiry = globalMaxExpiry;
        if (enforce2FA !== undefined) settings.enforce2FA = enforce2FA;
        if (retentionPeriod !== undefined) settings.retentionPeriod = retentionPeriod;
        if (companyIpRange !== undefined) settings.companyIpRange = companyIpRange;
        
        await settings.save();
        res.json(settings);
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const exportLogs = async (req, res) => {
    try {
        const logs = await SystemLog.find({}).sort({ timestamp: -1 });
        let csv = 'Timestamp,EventType,SecretKey,Details\n';
        logs.forEach(log => {
            csv += `"${log.timestamp}","${log.eventType}","${log.secretKey}","${log.details}"\n`;
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=security_audit_report.csv');
        res.status(200).send(csv);
    } catch (error) {
        console.error('Error exporting logs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getOverview,
    getUsers,
    deactivateUser,
    clearLegacyLogs,
    getSettings,
    updateSettings,
    exportLogs
};

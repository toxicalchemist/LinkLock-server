const Secret = require('../models/Secret');

const getMyVaults = async (req, res) => {
    try {
        const userId = req.user.id;

        const secrets = await Secret.find({ creatorId: userId }).sort({ createdAt: -1 });
        
        // Map to simpler format for frontend
        const vaults = secrets.map(secret => ({
            id: secret._id,
            key: secret.key,
            status: secret.status,
            viewLimit: secret.viewLimit,
            currentViews: secret.currentViews,
            expiresAt: secret.expiresAt,
            createdAt: secret.createdAt,
            hasFile: !!secret.originalFileName
        }));

        res.json(vaults);
    } catch (error) {
        console.error('Error fetching vaults:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { getMyVaults };

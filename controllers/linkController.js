const Secret = require('../models/Secret');
const SystemLog = require('../models/SystemLog');
const Settings = require('../models/Settings');
const { sendVaultInvite } = require('../utils/mailer');

const createSecret = async (req, res) => {
    try {
        console.log("Incoming Data:", req.body);
        const { key, encryptedContent, iv, viewLimit, expiryValue, expiryUnit, authorizedEmails, isPrivate } = req.body;
        const file = req.file;
        
        const settings = await Settings.findOne({});
        if (settings && settings.maintenanceMode) {
            return res.status(503).json({ error: 'System is under maintenance. Creation disabled.' });
        }
        
        if (!key || !encryptedContent || !expiryValue || !expiryUnit) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        let unitMultiplier = 1;
        if (expiryUnit === 'Minutes') unitMultiplier = 60;
        else if (expiryUnit === 'Hours') unitMultiplier = 3600;
        else if (expiryUnit === 'Days') unitMultiplier = 86400;
        else return res.status(400).json({ error: 'Invalid expiry unit' });

        const totalSeconds = parseInt(expiryValue) * unitMultiplier;
        const expiresAt = new Date(Date.now() + totalSeconds * 1000);

        const authorizedEmailsArray = Array.isArray(authorizedEmails) ? authorizedEmails : (authorizedEmails ? [authorizedEmails] : []);
        const isPrivateBool = isPrivate === 'true' || isPrivate === true || false;

        const secretData = {
            key,
            encryptedContent,
            iv,
            viewLimit: viewLimit || 1,
            expiresAt,
            creatorId: req.user.id,
            authorizedEmails: authorizedEmailsArray,
            isPrivate: isPrivateBool
        };

        if (file) {
            secretData.fileUrl = `uploads/${file.filename}`;
            secretData.fileType = file.mimetype;
            secretData.originalFileName = file.originalname;
        }

        const secret = new Secret(secretData);
        await secret.save();

        await SystemLog.create({
            eventType: 'SECRET_CREATED',
            secretKey: key,
            details: `New secret created with view limit: ${viewLimit}.`
        });

        // Email Notification Logic
        if (isPrivateBool && authorizedEmailsArray.length > 0) {
            for (const email of authorizedEmailsArray) {
                await sendVaultInvite(email, req.user.email, key);
            }
            return res.status(201).json({ 
                message: "Private Vault initialized. Notifications sent to recipients.", 
                key,
                isPrivate: true 
            });
        }

        res.status(201).json({ message: 'Secret created successfully', key });
    } catch (err) {
        console.error('Secret Creation Error:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
};

const getInbox = async (req, res) => {
    try {
        const userEmail = req.user.email;
        if (!userEmail) {
            return res.status(400).json({ error: 'User email not found.' });
        }

        const inboxLinks = await Secret.find({
            authorizedEmails: userEmail,
            expiresAt: { $gt: new Date() },
            status: 'Live'
        }).populate('creatorId', 'email').sort({ createdAt: -1 });

        const formattedLinks = inboxLinks.map(link => ({
            id: link._id,
            key: link.key,
            senderEmail: link.creatorId ? link.creatorId.email : 'Unknown',
            createdAt: link.createdAt,
            expiresAt: link.expiresAt
        }));

        res.status(200).json(formattedLinks);
    } catch (err) {
        console.error('Get Inbox Error:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
};

module.exports = { createSecret, getInbox };

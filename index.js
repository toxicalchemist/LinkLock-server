require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const Secret = require('./models/Secret');
const SystemLog = require('./models/SystemLog');
const Settings = require('./models/Settings');
const authController = require('./controllers/authController');
const vaultController = require('./controllers/vaultController');
const { authMiddleware, adminMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ status: 'LinkLock API Operational', version: '1.0.0' });
});

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ 
    storage: storage, 
    limits: { 
        fileSize: 50 * 1024 * 1024,
        fieldSize: 10 * 1024 * 1024 // 10MB for text fields
    } 
}); // 50MB file, 10MB fields limit

app.use('/uploads', express.static(uploadDir));

const initializeDB = async () => {
    let mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
        console.warn('No MONGODB_URI found! Using mongodb-memory-server for local dev/testing.');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        mongoUri = mongod.getUri();
    }

    // SIMULATE ATLAS TRIGGER for local testing/autonomous validation
    // This polls every 2 seconds to act like the Atlas Trigger if the user hasn't set it up yet.
    setInterval(async () => {
            try {
                const now = new Date();
                const secretsToBurn = await Secret.find({
                    status: 'Live',
                    $or: [
                        { $expr: { $gte: ["$currentViews", "$viewLimit"] } },
                        { expiresAt: { $lte: now } }
                    ]
                });

                for (const secret of secretsToBurn) {
                    const burnReason = secret.currentViews >= secret.viewLimit ? 'BURN_LIMIT_REACHED' : 'BURN_EXPIRED';
                    
                    // 0. Burn File from disk
                    if (secret.fileUrl) {
                        try {
                            const filePath = path.join(__dirname, secret.fileUrl);
                            if (fs.existsSync(filePath)) {
                                fs.unlinkSync(filePath);
                            }
                        } catch (err) {
                            console.error('File Burn Error:', err);
                        }
                    }

                    // 1. Mark Document as Burned
                    await Secret.updateOne({ _id: secret._id }, {
                        $set: { status: 'Burned', encryptedContent: 'BURNED', iv: 'BURNED', fileUrl: null, fileType: null }
                    });
                    
                    // 2. Log
                    await SystemLog.create({
                        eventType: burnReason,
                        secretKey: secret.key,
                        details: `Simulated Atlas Trigger Burned at views: ${secret.currentViews}/${secret.viewLimit}. Expired at: ${secret.expiresAt}, Now: ${now}`
                    });
                    
                    console.log(`[SIMULATED ATLAS TRIGGER] Document burnt: ${burnReason} for key: ${secret.key}`);
                }
            } catch (err) {
                console.error('Trigger Simulation Error:', err);
            }
        }, 2000);
    mongoose.connect(mongoUri)
      .then(async () => {
          console.log('MongoDB connected');
          try {
              const db = mongoose.connection.db;
              const collections = await db.listCollections({ name: 'systemlogs' }).toArray();
              if (collections.length > 0) {
                  console.log('Migrating systemlogs to system_logs...');
                  const oldLogs = await db.collection('systemlogs').find({}).toArray();
                  if (oldLogs.length > 0) {
                      await db.collection('system_logs').insertMany(oldLogs);
                  }
                  await db.collection('systemlogs').drop();
                  console.log('Migration complete. Dropped old systemlogs collection.');
              }
          } catch (migrationErr) {
              console.error('Migration error:', migrationErr);
          }
      })
      .catch(err => console.error('MongoDB connection error:', err));
}

initializeDB();

// Route to create a new secret
app.post('/api/secrets', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        console.log('Incoming Payload Body:', req.body);
        console.log('Incoming File:', req.file);
        const { key, encryptedContent, iv, viewLimit, expiryValue, expiryUnit } = req.body;
        const file = req.file;
        
        const settings = await Settings.findOne({});
        if (settings && settings.maintenanceMode) {
            return res.status(503).json({ error: 'System is under maintenance. Creation disabled.' });
        }
        
        if (!key || !encryptedContent || !expiryValue || !expiryUnit) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Calculate TotalSeconds
        let unitMultiplier = 1; // default seconds (though not an option)
        if (expiryUnit === 'Minutes') unitMultiplier = 60;
        else if (expiryUnit === 'Hours') unitMultiplier = 3600;
        else if (expiryUnit === 'Days') unitMultiplier = 86400;
        else return res.status(400).json({ error: 'Invalid expiry unit' });

        const totalSeconds = parseInt(expiryValue) * unitMultiplier;

        // Validation: Max Limit
        const MAX_SECONDS = settings && settings.globalMaxExpiry ? settings.globalMaxExpiry : 7 * 24 * 60 * 60;
        if (totalSeconds <= 0 || totalSeconds > MAX_SECONDS) {
            return res.status(400).json({ error: `Expiry must be between 1 minute and ${MAX_SECONDS / 86400} days` });
        }

        // Calculate exact expiresAt date
        const expiresAt = new Date(Date.now() + totalSeconds * 1000);

        const secretPayload = {
            key,
            encryptedContent,
            iv,
            viewLimit: viewLimit || 1,
            expiresAt,
            creatorId: req.user.id
        };

        if (file) {
            secretPayload.fileUrl = `/uploads/${file.filename}`;
            secretPayload.fileType = file.mimetype;
            secretPayload.originalFileName = file.originalname;
        }

        const secret = new Secret(secretPayload);

        await secret.save();
        res.status(201).json({ message: 'Secret created', key: secret.key });
    } catch (error) {
        console.error('CRITICAL ERROR IN POST /api/secrets:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Route to retrieve and view a secret
app.get('/api/secrets/:key', async (req, res) => {
    try {
        const { key } = req.params;

        const secret = await Secret.findOne({ key, status: 'Live' });

        if (!secret) {
            return res.status(404).json({ error: 'Secret not found or has been burned.' });
        }

        const updatedSecret = await Secret.findOneAndUpdate(
            { key },
            { $inc: { currentViews: 1 } },
            { new: true } 
        );

        if (!updatedSecret) {
            return res.status(404).json({ error: 'Secret not found or has been burned.' });
        }

        res.json({
            encryptedContent: updatedSecret.encryptedContent,
            iv: updatedSecret.iv,
            currentViews: updatedSecret.currentViews,
            viewLimit: updatedSecret.viewLimit,
            fileUrl: updatedSecret.fileUrl,
            fileType: updatedSecret.fileType,
            originalFileName: updatedSecret.originalFileName
        });
        
    } catch (error) {
        console.error('Error viewing secret:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const adminController = require('./controllers/adminController');
app.get('/api/admin/overview', authMiddleware, adminMiddleware, adminController.getOverview);
app.get('/api/admin/users', authMiddleware, adminMiddleware, adminController.getUsers);
app.put('/api/admin/users/:userId/deactivate', authMiddleware, adminMiddleware, adminController.deactivateUser);
app.delete('/api/admin/logs/legacy', authMiddleware, adminMiddleware, adminController.clearLegacyLogs);
app.get('/api/admin/settings', authMiddleware, adminMiddleware, adminController.getSettings);
app.put('/api/admin/settings', authMiddleware, adminMiddleware, adminController.updateSettings);
app.get('/api/admin/logs/export', authMiddleware, adminMiddleware, adminController.exportLogs);

app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.get('/api/auth/me', authController.verifyToken);

app.get('/api/user/vaults', authMiddleware, vaultController.getMyVaults);

// Global Error Handler for Multer and other middleware
app.use((err, req, res, next) => {
    console.error('GLOBAL SERVER ERROR:', err);
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: 'File Upload Error', details: err.message });
    }
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

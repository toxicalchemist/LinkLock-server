const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const Secret = require('./models/Secret');
const User = require('./models/User');
const SystemLog = require('./models/SystemLog');
const Settings = require('./models/Settings');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Storage configuration for Multer
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

// Static folder for uploaded files
app.use('/uploads', express.static(uploadDir));

const initializeDB = async () => {
    let mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
        console.warn('No MONGODB_URI found! Using mongodb-memory-server for local dev/testing.');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        mongoUri = mongod.getUri();
    }

    console.log("Attempting to connect to MongoDB...");
    
    return mongoose.connect(mongoUri)
      .then(async () => {
          console.log("✅ MongoDB Connected Successfully");
          try {
              const db = mongoose.connection.db;
              const collections = await db.listCollections({ name: 'systemlogs' }).toArray();
              if (collections.length > 0) {
                  const oldLogs = await db.collection('systemlogs').find({}).toArray();
                  if (oldLogs.length > 0) {
                      await db.collection('system_logs').insertMany(oldLogs);
                  }
                  await db.collection('systemlogs').drop();
              }
          } catch (migrationErr) {
              console.error('Migration error:', migrationErr);
          }
      })
      .catch((err) => {
          console.log("❌ MongoDB Connection Error:", err);
          process.exit(1);
      });
};

// SIMULATE ATLAS TRIGGER for local testing/autonomous validation
// This polls every 5 seconds to act like the Atlas Trigger if the user hasn't set it up yet.
setInterval(async () => {
    try {
        if (mongoose.connection.readyState !== 1) return;
        
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

            await Secret.updateOne({ _id: secret._id }, {
                $set: { status: 'Burned', encryptedContent: 'BURNED', iv: 'BURNED', fileUrl: null, fileType: null }
            });
            
            await SystemLog.create({
                eventType: burnReason,
                secretKey: secret.key,
                details: `Automated Lifecycle Purge at views: ${secret.currentViews}/${secret.viewLimit}.`
            });
        }
    } catch (err) {
        // console.error('Trigger Simulation Error:', err);
    }
}, 5000);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);

// Route to create a new secret
app.post('/api/secrets', authMiddleware, upload.single('file'), async (req, res) => {
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

        const secretData = {
            key,
            encryptedContent,
            iv,
            viewLimit: viewLimit || 1,
            expiresAt,
            creatorId: req.user.id,
            authorizedEmails: authorizedEmailsArray,
            isPrivate: isPrivate === 'true' || isPrivate === true || false
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

        res.status(201).json({ message: 'Secret created successfully', key });
    } catch (err) {
        console.error('Secret Creation Error:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
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

        if (secret.isPrivate) {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({ 
                    error: 'AUTHENTICATION_REQUIRED: This secret is marked as PRIVATE. Please login.',
                    requireLogin: true 
                });
            }

            try {
                const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development';
                const decoded = jwt.verify(token, JWT_SECRET);
                const user = await User.findById(decoded.id);

                if (!user || (secret.authorizedEmails && secret.authorizedEmails.length > 0 && !secret.authorizedEmails.includes(user.email))) {
                    return res.status(403).json({ error: "Access Denied: You are not authorized to view this private secret." });
                }
                
                if (secret.authorizedEmails && secret.authorizedEmails.length > 0 && !secret.viewedBy.includes(user.email)) {
                    await Secret.updateOne({ _id: secret._id }, { $push: { viewedBy: user.email } });
                }

                req.user = user;
            } catch (err) {
                return res.status(401).json({ 
                    error: 'AUTHENTICATION_EXPIRED: Session invalid. Please login again.',
                    requireLogin: true 
                });
            }
        }

        await Secret.updateOne({ _id: secret._id }, { $inc: { currentViews: 1 } });
        
        const updatedSecret = await Secret.findById(secret._id);
        
        await SystemLog.create({
            eventType: 'SECRET_VIEWED',
            secretKey: key,
            details: `Secret viewed. Progress: ${updatedSecret.currentViews}/${updatedSecret.viewLimit}.`
        });

        res.json({
            encryptedContent: secret.encryptedContent,
            iv: secret.iv,
            fileUrl: secret.fileUrl,
            fileType: secret.fileType,
            originalFileName: secret.originalFileName
        });
    } catch (err) {
        console.error('Secret Retrieval Error:', err);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// Settings check route
app.get('/api/settings', async (req, res) => {
    try {
        const settings = await Settings.findOne({});
        res.json(settings || { maintenanceMode: false });
    } catch (err) {
        res.status(500).json({ error: 'Error fetching settings' });
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

initializeDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});

const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const secretSchema = new Schema({
    key: { type: String, required: true, unique: true }, // The unique identifier part of the link
    encryptedContent: { type: String, required: [true, "Payload is mandatory"] },
    iv: { type: String, required: true }, // Initialization vector if needed, or can be part of encrypted string
    viewLimit: { type: Number, default: 1, min: [1, "View limit must be at least 1"] },
    currentViews: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    fileUrl: { type: String, default: null },
    fileType: { type: String, default: null },
    originalFileName: { type: String, default: null },
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['Live', 'Burned'], default: 'Live' },
    authorizedEmails: { type: [String], default: [] },
    viewedBy: { type: [String], default: [] },
    isPrivate: { type: Boolean, default: false }
}, { collection: 'active_links' });

secretSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Secret', secretSchema);

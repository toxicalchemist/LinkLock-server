const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const settingsSchema = new Schema({
    maintenanceMode: { type: Boolean, default: false },
    globalMaxExpiry: { type: Number, default: 604800 },
    enforce2FA: { type: Boolean, default: false },
    retentionPeriod: { type: Number, default: 604800 }, // in seconds, matches globalMaxExpiry conceptually, but maybe distinct
    companyIpRange: { type: String, default: '' }
}, { collection: 'settings' });

module.exports = mongoose.model('Settings', settingsSchema);

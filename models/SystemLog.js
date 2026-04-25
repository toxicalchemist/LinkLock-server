const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const systemLogSchema = new Schema({
    eventType: { type: String, required: true }, // e.g. "BURN_LIMIT_REACHED", "BURN_EXPIRED", "BURN_MANUAL"
    secretKey: { type: String, required: true },
    details: { type: String },
    timestamp: { type: Date, default: Date.now }
}, { collection: 'system_logs' });

module.exports = mongoose.model('SystemLog', systemLogSchema);

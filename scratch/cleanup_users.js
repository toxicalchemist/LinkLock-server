const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/linklock';

async function cleanup() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');
        
        const result = await mongoose.connection.collection('users').deleteMany({});
        console.log(`Deleted ${result.deletedCount} users.`);
        
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (err) {
        console.error('Cleanup error:', err);
    }
}

cleanup();

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/linklock';

async function fixIndexes() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');
        
        try {
            await mongoose.connection.collection('users').dropIndexes();
            console.log('Dropped all indexes on users collection.');
        } catch (err) {
            console.log('No indexes to drop or collection doesn\'t exist.');
        }
        
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (err) {
        console.error('Index fix error:', err);
    }
}

fixIndexes();

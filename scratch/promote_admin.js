const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/linklock';

async function promote() {
    try {
        await mongoose.connect(MONGO_URI);
        const res = await mongoose.connection.collection('users').updateOne(
            { email: 'ljcabunoc03@gmail.com' },
            { $set: { role: 'admin' } }
        );
        console.log('Promotion result:', res);
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

promote();

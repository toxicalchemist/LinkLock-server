const mongoose = require('mongoose');
const SystemLog = require('./models/SystemLog');

async function test() {
    await mongoose.connect('mongodb://127.0.0.1:27017/linklock-test-logs');
    
    // Clear
    await SystemLog.deleteMany({});
    
    // Create
    await SystemLog.create({
        eventType: 'TEST_EVENT',
        secretKey: 'TEST_KEY',
        details: 'TEST DETAILS'
    });
    
    console.log("All logs:");
    console.log(await SystemLog.find({}));
    
    console.log("Matched by clear pattern:");
    const matched = await SystemLog.find({
        $or: [
            { eventType: null },
            { secretKey: null },
            { secretKey: { $exists: false } }
        ]
    });
    console.log(matched);
    
    process.exit(0);
}

test();

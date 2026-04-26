const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const SystemLog = require('./models/SystemLog');

async function runTest() {
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);

    await SystemLog.create({
        eventType: 'TEST',
        secretKey: 'key',
        details: 'd'
    });

    const docCountBefore = await SystemLog.countDocuments();
    console.log("Docs before clear:", docCountBefore);
    
    const result = await SystemLog.deleteMany({
        $or: [
            { eventType: null },
            { secretKey: null },
            { secretKey: { $exists: false } }
        ]
    });
    
    console.log("Delete result:", result);
    const docCountAfter = await SystemLog.countDocuments();
    console.log("Docs after clear:", docCountAfter);

    await mongoose.disconnect();
    await mongod.stop();
    process.exit(0);
}

runTest();

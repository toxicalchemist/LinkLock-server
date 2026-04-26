require('dotenv').config();
const mongoose = require('mongoose');
const SystemLog = require('./models/SystemLog');

async function testAtlas() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const count = await SystemLog.countDocuments();
    console.log("Total logs in Atlas:", count);
    
    const matched = await SystemLog.find({
        $or: [
            { eventType: null },
            { secretKey: null },
            { secretKey: { $exists: false } }
        ]
    });
    
    console.log("Matched by clear filter:", matched.length);
    if (matched.length > 0) {
        console.log("First matched doc:", matched[0]);
    }
    
    await mongoose.disconnect();
    process.exit(0);
}

testAtlas();

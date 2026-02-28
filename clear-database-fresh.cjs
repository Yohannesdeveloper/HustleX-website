const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/hustlex";

async function clearDatabase() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB');

        const collections = ['users', 'jobs', 'applications', 'messages', 'blogs', 'companies'];

        for (const collectionName of collections) {
            try {
                const collection = mongoose.connection.collection(collectionName);
                const count = await collection.countDocuments();
                if (count > 0) {
                    await collection.deleteMany({});
                    console.log(`✅ Cleared ${count} documents from '${collectionName}' collection`);
                } else {
                    console.log(`ℹ️ Collection '${collectionName}' is already empty`);
                }
            } catch (err) {
                console.log(`⚠️ Could not clear collection '${collectionName}': ${err.message}`);
            }
        }

        console.log('\n✨ Database cleared successfully!');

        // Create Default Admin User
        const adminEmail = process.env.ADMIN_EMAIL || 'HustleXet@gmail.com';
        const adminPassword = 'admin123456'; // Default password for new fresh start

        // We need the User model to hash the password correctly
        const User = require('./backend/models/User');

        const adminUser = new User({
            email: adminEmail,
            password: adminPassword,
            roles: ['admin', 'client', 'freelancer'],
            currentRole: 'admin',
            profile: {
                firstName: 'System',
                lastName: 'Admin',
                isProfileComplete: true
            }
        });

        await adminUser.save();
        console.log(`\n👤 Created fresh Admin User:`);
        console.log(`   Email: ${adminEmail}`);
        console.log(`   Password: ${adminPassword}`);
        console.log(`\n🚀 You can now start fresh with this admin account.`);

    } catch (error) {
        console.error('❌ Error clearing database:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed.');
        process.exit(0);
    }
}

clearDatabase();

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.model';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/neurolearn';

async function listUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const users = await User.find({}).select('email firstName lastName role createdAt');
    
    console.log('📋 All User Accounts in Database:\n');
    console.log('═'.repeat(80));
    
    if (users.length === 0) {
      console.log('No users found in database.');
    } else {
      users.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.firstName} ${user.lastName}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Created: ${user.createdAt.toLocaleDateString()}`);
      });
    }
    
    console.log('\n' + '═'.repeat(80));
    console.log(`\nTotal: ${users.length} user(s)`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

listUsers();

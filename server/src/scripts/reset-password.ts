import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.model';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/neurolearn';

async function resetPassword() {
  try {
    console.log('🔑 Resetting password for existing student account...\n');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find the existing student
    const user = await User.findOne({ email: 'test@gmail.com' });
    
    if (!user) {
      console.log('❌ User test@gmail.com not found!');
      process.exit(1);
    }

    // Reset password
    user.password = 'Test123!';
    await user.save();

    console.log('✅ Password reset successfully!\n');
    console.log('🔐 Login Credentials:');
    console.log('   Email: test@gmail.com');
    console.log('   Password: Test123!');
    console.log('\n👤 Account Details:');
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Role: ${user.role}`);
    console.log('\n🎉 You can now login with these credentials!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

resetPassword();

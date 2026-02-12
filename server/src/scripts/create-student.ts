import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.model';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/neurolearn';

async function createStudent() {
  try {
    console.log('👨‍🎓 Creating test student account...\n');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Delete existing test student if exists
    await User.deleteMany({ email: 'student@neurolearn.com' });

    // Create test student with ADHD profile
    const student = await User.create({
      email: 'student@neurolearn.com',
      password: 'Student123!',
      firstName: 'Alex',
      lastName: 'Smith',
      role: 'student',
      neurodiverseProfile: {
        conditions: ['adhd'],
        sensoryPreferences: {
          visualSensitivity: 'high',
          audioSensitivity: 'medium',
          preferredLearningStyle: ['visual', 'kinesthetic'],
        },
        focusSettings: {
          sessionDuration: 15,
          breakDuration: 5,
          breakReminders: true,
          distractionBlocker: true,
        },
        accessibilitySettings: {
          fontSize: 'large',
          fontFamily: 'dyslexia-friendly',
          highContrast: false,
          reducedMotion: true,
          textToSpeech: false,
          lineSpacing: 'relaxed',
          colorTheme: 'light',
        },
      },
    });

    console.log('✅ Student account created successfully!\n');
    console.log('🔐 Student Login Credentials:');
    console.log('   Email: student@neurolearn.com');
    console.log('   Password: Student123!');
    console.log('\n👤 Profile:');
    console.log('   Name: Alex Smith');
    console.log('   Condition: ADHD');
    console.log('   Focus Session: 15 minutes');
    console.log('\n🎉 You can now login with these credentials!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating student:', error);
    process.exit(1);
  }
}

createStudent();

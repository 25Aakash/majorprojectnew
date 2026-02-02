/**
 * Content Import Script
 * 
 * This script imports courses and lessons from JSON files.
 * 
 * Usage:
 * 1. Create a JSON file with your content (see sample-content.json)
 * 2. Run: npx ts-node src/scripts/import-content.ts <path-to-json>
 */

import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { Course, Lesson } from '../models/Course.model';
import { User } from '../models/User.model';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://aakashkhandelwal2225:myPass1234@cluster0.arqgg2a.mongodb.net/neurolearn?retryWrites=true&w=majority';

interface ContentData {
  educatorEmail: string;
  courses: {
    title: string;
    description: string;
    category: string;
    difficulty: string;
    thumbnail?: string;
    targetAudience?: string[];
    accessibilityFeatures?: string[];
    isPublished?: boolean;
    lessons: {
      title: string;
      content: string;
      type?: 'text' | 'video' | 'interactive';
      duration?: number;
      videoUrl?: string;
      quiz?: {
        question: string;
        options: string[];
        correctAnswer: number;
        explanation?: string;
      }[];
      learningObjectives?: string[];
    }[];
  }[];
}

async function importContent(jsonPath: string) {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Read JSON file
    const absolutePath = path.resolve(jsonPath);
    const content: ContentData = JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));

    // Find educator
    const educator = await User.findOne({ email: content.educatorEmail });
    if (!educator) {
      console.error('❌ Educator not found:', content.educatorEmail);
      process.exit(1);
    }
    console.log(`📚 Importing content for educator: ${educator.firstName} ${educator.lastName}`);

    let coursesCreated = 0;
    let lessonsCreated = 0;

    for (const courseData of content.courses) {
      // Create course
      const course = new Course({
        title: courseData.title,
        description: courseData.description,
        category: courseData.category,
        difficulty: courseData.difficulty || 'beginner',
        thumbnail: courseData.thumbnail,
        targetAudience: courseData.targetAudience || [],
        accessibilityFeatures: courseData.accessibilityFeatures || [],
        isPublished: courseData.isPublished ?? true,
        instructor: educator._id,
        lessons: [],
      });

      await course.save();
      coursesCreated++;
      console.log(`  📖 Created course: ${course.title}`);

      // Create lessons
      for (let i = 0; i < courseData.lessons.length; i++) {
        const lessonData = courseData.lessons[i];
        
        // Convert content string to contentBlocks array
        const contentBlocks = [{
          type: lessonData.type || 'text',
          content: lessonData.content,
        }];
        
        // Convert quiz format if needed
        const quiz = lessonData.quiz ? {
          questions: lessonData.quiz.map(q => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || '',
            points: 10,
          })),
          passingScore: 70,
        } : undefined;
        
        const lesson = new Lesson({
          courseId: course._id,
          title: lessonData.title,
          description: lessonData.content.substring(0, 200) + '...',
          contentBlocks: contentBlocks,
          estimatedDuration: lessonData.duration || 10,
          order: i + 1,
          quiz: quiz,
          learningObjectives: lessonData.learningObjectives || [],
          isPublished: true,
        });

        await lesson.save();
        course.lessons.push(lesson._id);
        lessonsCreated++;
        console.log(`    📝 Created lesson: ${lesson.title}`);
      }

      await course.save();
    }

    console.log('\n✅ Import complete!');
    console.log(`   Courses created: ${coursesCreated}`);
    console.log(`   Lessons created: ${lessonsCreated}`);

  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

// Run import
const jsonPath = process.argv[2];
if (!jsonPath) {
  console.log('Usage: npx ts-node src/scripts/import-content.ts <path-to-json>');
  console.log('Example: npx ts-node src/scripts/import-content.ts ./content/my-courses.json');
  process.exit(1);
}

importContent(jsonPath);

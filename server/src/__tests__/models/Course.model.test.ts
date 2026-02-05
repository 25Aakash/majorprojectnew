import mongoose from 'mongoose';
import { Course, ICourse, Lesson } from '../../models/Course.model';
import { User } from '../../models/User.model';

describe('Course Model', () => {
  let instructorId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    // Create an instructor user
    const instructor = new User({
      email: 'instructor@test.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'Instructor',
      role: 'educator',
    });
    await instructor.save();
    instructorId = instructor._id as mongoose.Types.ObjectId;
  });

  describe('Schema Validation', () => {
    it('should create a valid course with required fields', async () => {
      const courseData = {
        title: 'Test Course',
        description: 'A test course description',
        category: 'Programming',
        instructor: instructorId,
      };

      const course = new Course(courseData);
      const savedCourse = await course.save();

      expect(savedCourse._id).toBeDefined();
      expect(savedCourse.title).toBe('Test Course');
      expect(savedCourse.category).toBe('Programming');
      expect(savedCourse.difficulty).toBe('beginner'); // default
      expect(savedCourse.isPublished).toBe(false); // default
    });

    it('should fail without required title', async () => {
      const courseData = {
        description: 'A test course description',
        category: 'Programming',
        instructor: instructorId,
      };

      const course = new Course(courseData);
      await expect(course.save()).rejects.toThrow();
    });

    it('should fail without required description', async () => {
      const courseData = {
        title: 'Test Course',
        category: 'Programming',
        instructor: instructorId,
      };

      const course = new Course(courseData);
      await expect(course.save()).rejects.toThrow();
    });

    it('should fail without required category', async () => {
      const courseData = {
        title: 'Test Course',
        description: 'A test course description',
        instructor: instructorId,
      };

      const course = new Course(courseData);
      await expect(course.save()).rejects.toThrow();
    });

    it('should fail without required instructor', async () => {
      const courseData = {
        title: 'Test Course',
        description: 'A test course description',
        category: 'Programming',
      };

      const course = new Course(courseData);
      await expect(course.save()).rejects.toThrow();
    });
  });

  describe('Difficulty Levels', () => {
    it('should accept valid difficulty levels', async () => {
      const difficulties = ['beginner', 'intermediate', 'advanced'];

      for (let i = 0; i < difficulties.length; i++) {
        const courseData = {
          title: `Test Course ${i}`,
          description: 'A test course description',
          category: 'Programming',
          instructor: instructorId,
          difficulty: difficulties[i],
        };

        const course = new Course(courseData);
        const saved = await course.save();
        expect(saved.difficulty).toBe(difficulties[i]);
      }
    });

    it('should reject invalid difficulty level', async () => {
      const courseData = {
        title: 'Test Course',
        description: 'A test course description',
        category: 'Programming',
        instructor: instructorId,
        difficulty: 'expert',
      };

      const course = new Course(courseData);
      await expect(course.save()).rejects.toThrow();
    });
  });

  describe('Neurodiverse Features', () => {
    it('should have default neurodiverse features as false', async () => {
      const courseData = {
        title: 'Test Course',
        description: 'A test course description',
        category: 'Programming',
        instructor: instructorId,
      };

      const course = new Course(courseData);
      const saved = await course.save();

      expect(saved.neurodiverseFeatures.adhdFriendly).toBe(false);
      expect(saved.neurodiverseFeatures.autismFriendly).toBe(false);
      expect(saved.neurodiverseFeatures.dyslexiaFriendly).toBe(false);
    });

    it('should save neurodiverse features when provided', async () => {
      const courseData = {
        title: 'Test Course',
        description: 'A test course description',
        category: 'Programming',
        instructor: instructorId,
        neurodiverseFeatures: {
          adhdFriendly: true,
          autismFriendly: true,
          dyslexiaFriendly: false,
        },
      };

      const course = new Course(courseData);
      const saved = await course.save();

      expect(saved.neurodiverseFeatures.adhdFriendly).toBe(true);
      expect(saved.neurodiverseFeatures.autismFriendly).toBe(true);
      expect(saved.neurodiverseFeatures.dyslexiaFriendly).toBe(false);
    });
  });

  describe('Tags and Metadata', () => {
    it('should save tags array', async () => {
      const courseData = {
        title: 'Test Course',
        description: 'A test course description',
        category: 'Programming',
        instructor: instructorId,
        tags: ['javascript', 'nodejs', 'backend'],
      };

      const course = new Course(courseData);
      const saved = await course.save();

      expect(saved.tags).toContain('javascript');
      expect(saved.tags).toContain('nodejs');
      expect(saved.tags.length).toBe(3);
    });

    it('should default rating and enrollment count to 0', async () => {
      const courseData = {
        title: 'Test Course',
        description: 'A test course description',
        category: 'Programming',
        instructor: instructorId,
      };

      const course = new Course(courseData);
      const saved = await course.save();

      expect(saved.rating).toBe(0);
      expect(saved.enrollmentCount).toBe(0);
    });
  });

  describe('Timestamps', () => {
    it('should add createdAt and updatedAt', async () => {
      const courseData = {
        title: 'Test Course',
        description: 'A test course description',
        category: 'Programming',
        instructor: instructorId,
      };

      const course = new Course(courseData);
      const saved = await course.save();

      expect(saved.createdAt).toBeDefined();
      expect(saved.updatedAt).toBeDefined();
    });
  });
});

describe('Lesson Model', () => {
  let courseId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    const instructor = new User({
      email: 'instructor@test.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'Instructor',
      role: 'educator',
    });
    await instructor.save();

    const course = new Course({
      title: 'Test Course',
      description: 'A test course',
      category: 'Programming',
      instructor: instructor._id,
    });
    await course.save();
    courseId = course._id as mongoose.Types.ObjectId;
  });

  describe('Schema Validation', () => {
    it('should create a valid lesson with required fields', async () => {
      const lessonData = {
        title: 'Test Lesson',
        courseId: courseId,
        order: 1,
      };

      const lesson = new Lesson(lessonData);
      const saved = await lesson.save();

      expect(saved._id).toBeDefined();
      expect(saved.title).toBe('Test Lesson');
      expect(saved.order).toBe(1);
      expect(saved.difficulty).toBe('beginner'); // default
    });

    it('should fail without required title', async () => {
      const lessonData = {
        courseId: courseId,
        order: 1,
      };

      const lesson = new Lesson(lessonData);
      await expect(lesson.save()).rejects.toThrow();
    });

    it('should fail without required courseId', async () => {
      const lessonData = {
        title: 'Test Lesson',
        order: 1,
      };

      const lesson = new Lesson(lessonData);
      await expect(lesson.save()).rejects.toThrow();
    });

    it('should fail without required order', async () => {
      const lessonData = {
        title: 'Test Lesson',
        courseId: courseId,
      };

      const lesson = new Lesson(lessonData);
      await expect(lesson.save()).rejects.toThrow();
    });
  });

  describe('Content Blocks', () => {
    it('should save lesson with content blocks', async () => {
      const lessonData = {
        title: 'Test Lesson',
        courseId: courseId,
        order: 1,
        contentBlocks: [
          { type: 'text', content: 'Introduction text' },
          { type: 'video', content: 'https://example.com/video.mp4', duration: 300 },
        ],
      };

      const lesson = new Lesson(lessonData);
      const saved = await lesson.save();

      expect(saved.contentBlocks.length).toBe(2);
      expect(saved.contentBlocks[0].type).toBe('text');
      expect(saved.contentBlocks[1].type).toBe('video');
    });

    it('should accept valid content types', async () => {
      const types = ['text', 'video', 'audio', 'interactive', 'image', 'quiz'];

      for (let i = 0; i < types.length; i++) {
        const lessonData = {
          title: `Test Lesson ${i}`,
          courseId: courseId,
          order: i + 1,
          contentBlocks: [
            { type: types[i], content: 'Test content' },
          ],
        };

        const lesson = new Lesson(lessonData);
        const saved = await lesson.save();
        expect(saved.contentBlocks[0].type).toBe(types[i]);
      }
    });
  });

  describe('Adaptive Content', () => {
    it('should save adaptive content variations', async () => {
      const lessonData = {
        title: 'Test Lesson',
        courseId: courseId,
        order: 1,
        adaptiveContent: {
          simplifiedVersion: [{ type: 'text', content: 'Simple text' }],
          advancedVersion: [{ type: 'text', content: 'Advanced text' }],
          visualEnhanced: [{ type: 'image', content: 'https://example.com/image.png' }],
          audioEnhanced: [{ type: 'audio', content: 'https://example.com/audio.mp3' }],
        },
      };

      const lesson = new Lesson(lessonData);
      const saved = await lesson.save();

      expect(saved.adaptiveContent?.simplifiedVersion).toHaveLength(1);
      expect(saved.adaptiveContent?.advancedVersion).toHaveLength(1);
    });
  });

  describe('Learning Objectives', () => {
    it('should save learning objectives', async () => {
      const lessonData = {
        title: 'Test Lesson',
        courseId: courseId,
        order: 1,
        learningObjectives: [
          'Understand basic concepts',
          'Apply learned skills',
          'Evaluate solutions',
        ],
      };

      const lesson = new Lesson(lessonData);
      const saved = await lesson.save();

      expect(saved.learningObjectives).toHaveLength(3);
      expect(saved.learningObjectives).toContain('Understand basic concepts');
    });
  });
});

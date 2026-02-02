import { Router, Request, Response } from 'express';
import { body, validationResult, query } from 'express-validator';
import { Course, Lesson } from '../models/Course.model';
import { Progress } from '../models/Progress.model';
import { authMiddleware, AuthRequest, roleMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Get all courses with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      category,
      difficulty,
      adhdFriendly,
      autismFriendly,
      dyslexiaFriendly,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const filter: Record<string, unknown> = { isPublished: true };

    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (adhdFriendly === 'true') filter['neurodiverseFeatures.adhdFriendly'] = true;
    if (autismFriendly === 'true') filter['neurodiverseFeatures.autismFriendly'] = true;
    if (dyslexiaFriendly === 'true') filter['neurodiverseFeatures.dyslexiaFriendly'] = true;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search as string, 'i')] } },
      ];
    }

    const courses = await Course.find(filter)
      .populate('instructor', 'firstName lastName')
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Course.countDocuments(filter);

    res.json({
      courses,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching courses' });
  }
});

// Get educator's own courses
router.get('/my-courses', authMiddleware, roleMiddleware('educator', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const courses = await Course.find({ instructor: req.user?._id })
      .populate('lessons', 'title duration type')
      .sort({ createdAt: -1 });

    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching your courses' });
  }
});

// Get single course
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'firstName lastName')
      .populate('lessons');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json(course);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching course' });
  }
});

// Create course (educators only)
router.post(
  '/',
  authMiddleware,
  roleMiddleware('educator', 'admin'),
  [
    body('title').trim().notEmpty(),
    body('description').trim().notEmpty(),
    body('category').trim().notEmpty(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const course = new Course({
        ...req.body,
        instructor: req.user?._id,
      });

      await course.save();
      res.status(201).json(course);
    } catch (error) {
      res.status(500).json({ message: 'Error creating course' });
    }
  }
);

// Update course
router.put(
  '/:id',
  authMiddleware,
  roleMiddleware('educator', 'admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const course = await Course.findById(req.params.id);

      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Check if user is the instructor or admin
      if (course.instructor.toString() !== req.user?._id.toString() && req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to update this course' });
      }

      const updatedCourse = await Course.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true }
      );

      res.json(updatedCourse);
    } catch (error) {
      res.status(500).json({ message: 'Error updating course' });
    }
  }
);

// Delete course
router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware('educator', 'admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const course = await Course.findById(req.params.id);

      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Check if user is the instructor or admin
      if (course.instructor.toString() !== req.user?._id.toString() && req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to delete this course' });
      }

      // Delete all lessons
      await Lesson.deleteMany({ courseId: course._id });
      
      // Delete course
      await Course.findByIdAndDelete(req.params.id);

      res.json({ message: 'Course deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting course' });
    }
  }
);

// Enroll in course
router.post('/:id/enroll', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if already enrolled
    const existingProgress = await Progress.findOne({
      userId: req.user?._id,
      courseId: course._id,
    });

    if (existingProgress) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    // Create progress record
    const progress = new Progress({
      userId: req.user?._id,
      courseId: course._id,
      currentLesson: course.lessons[0],
    });

    await progress.save();

    // Update enrollment count
    course.enrollmentCount += 1;
    await course.save();

    res.status(201).json({ message: 'Enrolled successfully', progress });
  } catch (error) {
    res.status(500).json({ message: 'Error enrolling in course' });
  }
});

// Add lesson to course
router.post(
  '/:id/lessons',
  authMiddleware,
  roleMiddleware('educator', 'admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const course = await Course.findById(req.params.id);

      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Build contentBlocks from the simpler form data
      const contentBlocks = [];
      
      // If it's a video lesson, add video block first
      if (req.body.type === 'video' && req.body.videoUrl) {
        contentBlocks.push({
          type: 'video',
          content: req.body.videoUrl,
          transcription: req.body.transcription || '',
        });
      }
      
      // Add text content block
      if (req.body.content) {
        contentBlocks.push({
          type: 'text',
          content: req.body.content,
        });
      }

      const lesson = new Lesson({
        title: req.body.title,
        description: req.body.content?.substring(0, 200) || req.body.title,
        courseId: course._id,
        order: course.lessons.length + 1,
        contentBlocks: contentBlocks.length > 0 ? contentBlocks : [{ type: 'text', content: req.body.content || '' }],
        difficulty: req.body.difficulty || 'beginner',
        estimatedDuration: req.body.duration || 10,
        learningObjectives: req.body.learningObjectives || [],
        quiz: req.body.quiz || [],
        isPublished: true,
      });

      await lesson.save();

      course.lessons.push(lesson._id);
      course.estimatedDuration += lesson.estimatedDuration || 10;
      await course.save();

      res.status(201).json(lesson);
    } catch (error) {
      console.error('Error adding lesson:', error);
      res.status(500).json({ message: 'Error adding lesson' });
    }
  }
);

// Get lesson with adaptive content
router.get('/:courseId/lessons/:lessonId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const lesson = await Lesson.findById(req.params.lessonId);

    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    const lessonObj = lesson.toObject() as unknown as Record<string, unknown>;
    
    // Handle legacy lessons that have 'content' string instead of 'contentBlocks'
    let contentBlocks = lesson.contentBlocks || [];
    if (contentBlocks.length === 0 && lessonObj.content) {
      contentBlocks = [{
        type: 'text' as const,
        content: lessonObj.content as string,
      }];
    }
    
    // Normalize quiz format (array -> object)
    let quiz = lessonObj.quiz as Record<string, unknown> | unknown[] | undefined;
    if (Array.isArray(quiz) && quiz.length > 0) {
      quiz = {
        questions: quiz.map((q: unknown) => {
          const question = q as Record<string, unknown>;
          return {
            question: question.question || '',
            options: question.options || [],
            correctAnswer: question.correctAnswer ?? 0,
            explanation: question.explanation || '',
            points: question.points || 10,
          };
        }),
        passingScore: 70,
      };
    }

    // Get user's neurodiverse profile to serve appropriate content
    const userProfile = req.user?.neurodiverseProfile;
    let contentToServe = contentBlocks;

    // Adaptive content selection based on user preferences
    if (userProfile && lesson.adaptiveContent) {
      const preferredStyle = userProfile.sensoryPreferences?.preferredLearningStyle?.[0];

      if (preferredStyle === 'visual' && lesson.adaptiveContent.visualEnhanced?.length) {
        contentToServe = lesson.adaptiveContent.visualEnhanced;
      } else if (preferredStyle === 'auditory' && lesson.adaptiveContent.audioEnhanced?.length) {
        contentToServe = lesson.adaptiveContent.audioEnhanced;
      }

      // If dyslexia, prefer simplified version
      if (userProfile.conditions?.includes('dyslexia') && lesson.adaptiveContent.simplifiedVersion?.length) {
        contentToServe = lesson.adaptiveContent.simplifiedVersion;
      }
    }

    res.json({
      ...lessonObj,
      contentBlocks: contentToServe,
      quiz: quiz,
      estimatedDuration: lesson.estimatedDuration || lessonObj.duration || 10,
    });
  } catch (error) {
    console.error('Error fetching lesson:', error);
    res.status(500).json({ message: 'Error fetching lesson' });
  }
});

// Update lesson
router.put(
  '/:courseId/lessons/:lessonId',
  authMiddleware,
  roleMiddleware('educator', 'admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const course = await Course.findById(req.params.courseId);

      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Check if user is the instructor or admin
      if (course.instructor.toString() !== req.user?._id.toString() && req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to update this lesson' });
      }

      // Build contentBlocks from the simpler form data
      const contentBlocks = [];
      
      // If it's a video lesson, add video block first
      if (req.body.type === 'video' && req.body.videoUrl) {
        contentBlocks.push({
          type: 'video',
          content: req.body.videoUrl,
          transcription: req.body.transcription || '',
        });
      }
      
      // Add text content block
      if (req.body.content) {
        contentBlocks.push({
          type: 'text',
          content: req.body.content,
        });
      }

      const updateData: Record<string, unknown> = {
        title: req.body.title,
        estimatedDuration: req.body.duration || 10,
        learningObjectives: req.body.learningObjectives || [],
        quiz: req.body.quiz || [],
      };
      
      if (contentBlocks.length > 0) {
        updateData.contentBlocks = contentBlocks;
      }

      const lesson = await Lesson.findByIdAndUpdate(
        req.params.lessonId,
        { $set: updateData },
        { new: true }
      );

      if (!lesson) {
        return res.status(404).json({ message: 'Lesson not found' });
      }

      res.json(lesson);
    } catch (error) {
      res.status(500).json({ message: 'Error updating lesson' });
    }
  }
);

// Delete lesson
router.delete(
  '/:courseId/lessons/:lessonId',
  authMiddleware,
  roleMiddleware('educator', 'admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const course = await Course.findById(req.params.courseId);

      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Check if user is the instructor or admin
      if (course.instructor.toString() !== req.user?._id.toString() && req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to delete this lesson' });
      }

      const lesson = await Lesson.findByIdAndDelete(req.params.lessonId);

      if (!lesson) {
        return res.status(404).json({ message: 'Lesson not found' });
      }

      // Remove lesson from course
      course.lessons = course.lessons.filter(l => l.toString() !== req.params.lessonId);
      await course.save();

      res.json({ message: 'Lesson deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting lesson' });
    }
  }
);

// Reorder lessons
router.put(
  '/:courseId/lessons/reorder',
  authMiddleware,
  roleMiddleware('educator', 'admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { lessons } = req.body;
      
      if (!lessons || !Array.isArray(lessons)) {
        return res.status(400).json({ message: 'Invalid lessons data' });
      }

      const course = await Course.findById(req.params.courseId);

      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Check if user is the instructor or admin
      if (course.instructor.toString() !== req.user?._id.toString() && req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to reorder lessons' });
      }

      // Update each lesson's order
      for (const lessonData of lessons) {
        await Lesson.findByIdAndUpdate(lessonData._id, { order: lessonData.order });
      }

      res.json({ message: 'Lessons reordered successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error reordering lessons' });
    }
  }
);

export default router;

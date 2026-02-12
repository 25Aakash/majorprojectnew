import { Router, Response } from 'express';
import axios from 'axios';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { aiLimiter } from '../middleware/rateLimit.middleware';

const router = Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Proxy endpoint for AI content generation
 * Transforms frontend request to match AI service expectations
 */
router.post('/generate-content', authMiddleware, aiLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      topic, 
      course_id, 
      difficulty, 
      content_type, 
      count,
      subject,
      conditions,
      learning_styles 
    } = req.body;

    // Get user's neurodiverse profile for personalization
    const user = req.user;
    const userConditions = user?.neurodiverseProfile?.conditions || [];
    const userLearningStyles = user?.neurodiverseProfile?.sensoryPreferences?.preferredLearningStyle || ['visual'];

    // Map numeric difficulty to string
    let difficultyLevel = 'beginner';
    if (typeof difficulty === 'number') {
      if (difficulty <= 3) difficultyLevel = 'beginner';
      else if (difficulty <= 5) difficultyLevel = 'intermediate';
      else difficultyLevel = 'advanced';
    } else {
      difficultyLevel = difficulty || 'beginner';
    }

    // Transform request to match AI service schema
    const aiRequest = {
      topic: topic || 'General Assessment',
      subject: subject || topic || 'General Knowledge',
      conditions: conditions || userConditions,
      learning_styles: learning_styles || userLearningStyles,
      difficulty: difficultyLevel,
    };

    // Call AI service
    const response = await axios.post(
      `${AI_SERVICE_URL}/api/ai/generate-content`,
      aiRequest,
      {
        timeout: 30000, // 30 second timeout
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    // If requesting quiz/assessment questions, format response
    if (content_type === 'quiz') {
      const content = response.data;
      
      // Generate quiz questions from content
      const questions = generateQuestionsFromContent(content, count || 10, difficultyLevel);
      
      res.json({ 
        success: true,
        questions,
        content,
      });
    } else {
      res.json(response.data);
    }
  } catch (error: any) {
    console.error('AI service error:', error.message);
    
    // If AI service is unavailable, return fallback
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.json({
        success: true,
        questions: generateFallbackQuestions(req.body.count || 10, req.body.difficulty),
        message: 'Using fallback questions (AI service unavailable)',
      });
    }
    
    res.status(error.response?.status || 500).json({ 
      message: error.response?.data?.detail || 'Error generating content',
      error: error.message,
    });
  }
});

/**
 * Generate quiz questions from AI-generated content
 */
function generateQuestionsFromContent(content: any, count: number, difficulty: string): any[] {
  const questions: any[] = [];
  
  // Extract key concepts from content
  const sections = content.sections || [];
  const keyPoints = sections.flatMap((s: any) => s.key_points || []);
  
  for (let i = 0; i < Math.min(count, 10); i++) {
    const keyPoint = keyPoints[i % keyPoints.length] || `Concept ${i + 1}`;
    
    questions.push({
      id: `q-${i}`,
      conceptId: `concept-${i}`,
      text: `Question about ${keyPoint}: Which statement is most accurate?`,
      options: [
        keyPoint,
        `Alternative interpretation of ${keyPoint}`,
        `Common misconception about ${keyPoint}`,
        `Unrelated concept`,
      ],
      correctIndex: 0,
      difficulty: difficulty === 'beginner' ? 3 : difficulty === 'intermediate' ? 5 : 7,
      explanation: `This question tests understanding of: ${keyPoint}`,
    });
  }
  
  return questions;
}

/**
 * Generate fallback questions when AI service is unavailable
 */
function generateFallbackQuestions(count: number, difficulty: number | string): any[] {
  const questions: any[] = [];
  const difficultyLevel = typeof difficulty === 'number' ? difficulty : 5;
  
  for (let i = 0; i < count; i++) {
    questions.push({
      id: `fallback-${i}`,
      conceptId: `concept-${i}`,
      text: `Assessment question ${i + 1}: Select the best answer based on the course material.`,
      options: [
        'Option A - Correct answer',
        'Option B - Common misconception',
        'Option C - Partially correct',
        'Option D - Incorrect',
      ],
      correctIndex: 0,
      difficulty: difficultyLevel,
      explanation: 'This is a fallback question. The AI service will generate personalized questions when available.',
    });
  }
  
  return questions;
}

/**
 * Proxy endpoint for quiz generation
 */
router.post('/generate-quiz', authMiddleware, aiLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/api/ai/generate-quiz`,
      req.body,
      {
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    
    res.json(response.data);
  } catch (error: any) {
    console.error('AI quiz generation error:', error.message);
    
    // Fallback to basic quiz
    res.json({
      success: true,
      quiz: generateFallbackQuestions(req.body.question_count || 10, req.body.difficulty || 5),
      message: 'Using fallback quiz (AI service unavailable)',
    });
  }
});

/**
 * Proxy endpoint for content adaptation
 */
router.post('/adapt-content', authMiddleware, aiLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const userConditions = user?.neurodiverseProfile?.conditions || [];
    const userLearningStyles = user?.neurodiverseProfile?.sensoryPreferences?.preferredLearningStyle || ['visual'];

    const adaptRequest = {
      content: req.body.content,
      conditions: req.body.conditions || userConditions,
      learning_styles: req.body.learning_styles || userLearningStyles,
    };

    const response = await axios.post(
      `${AI_SERVICE_URL}/api/ai/adapt-content`,
      adaptRequest,
      {
        timeout: 15000,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    
    res.json(response.data);
  } catch (error: any) {
    console.error('AI content adaptation error:', error.message);
    
    res.status(error.response?.status || 500).json({ 
      message: 'Error adapting content',
      error: error.message,
    });
  }
});

/**
 * Proxy endpoint for knowledge trace batch update
 */
router.post('/knowledge-trace/batch-update', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { user_id, attempts, condition } = req.body;
    
    // Get user's condition if not provided
    const user = req.user;
    const userCondition = condition || user?.neurodiverseProfile?.conditions?.[0] || null;

    const batchRequest = {
      user_id: user_id === 'current' ? user?._id.toString() : user_id,
      attempts,
      condition: userCondition,
    };

    const response = await axios.post(
      `${AI_SERVICE_URL}/api/ai/knowledge-trace/batch-update`,
      batchRequest,
      {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    
    res.json(response.data);
  } catch (error: any) {
    console.error('Knowledge trace batch update error:', error.message);
    
    // Graceful fallback when AI service is unavailable
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.json({
        success: true,
        message: 'Knowledge trace update queued (AI service unavailable)',
        results: req.body.attempts?.map((attempt: any) => ({
          concept_id: attempt.concept_id,
          mastery_probability: 0.5,
          needs_review: true,
        })),
      });
    }
    
    res.status(error.response?.status || 500).json({ 
      message: 'Error updating knowledge trace',
      error: error.message,
    });
  }
});

/**
 * Get AI service health status
 */
router.get('/health', async (req, res) => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 5000 });
    res.json({ 
      status: 'connected',
      aiService: response.data,
    });
  } catch (error) {
    res.json({ 
      status: 'disconnected',
      message: 'AI service is not available',
    });
  }
});

export default router;

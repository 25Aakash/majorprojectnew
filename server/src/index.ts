// ...existing code remains, only one set of imports and declarations...
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import axios from 'axios';

// Route imports
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import courseRoutes from './routes/course.routes';
import progressRoutes from './routes/progress.routes';
import adaptiveRoutes from './routes/adaptive.routes';
import configRoutes from './routes/config.routes';
import adaptiveLearningRoutes from './routes/adaptive-learning.routes';
import biometricRoutes from './routes/biometric.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/user', userRoutes); // Also mount at singular for frontend compatibility
app.use('/api/courses', courseRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/adaptive', adaptiveRoutes);
app.use('/api/adaptive-learning', adaptiveLearningRoutes);
app.use('/api/biometric', biometricRoutes);
app.use('/api/config', configRoutes);

// AI Service proxy routes
app.post('/api/ai/*', async (req, res) => {
  try {
    // Remove '/api/ai' prefix and forward to AI service's /api path
    const aiPath = req.path.replace('/api/ai', '');
    const response = await axios.post(`${AI_SERVICE_URL}/api${aiPath}`, req.body);
    res.json(response.data);
  } catch (error: unknown) {
    const axiosError = error as { response?: { status: number; data: unknown } };
    if (axiosError.response) {
      res.status(axiosError.response.status).json(axiosError.response.data);
    } else {
      res.status(500).json({ message: 'AI service unavailable' });
    }
  }
});

app.get('/api/ai/*', async (req, res) => {
  try {
    // Remove '/api/ai' prefix and forward to AI service's /api path
    const aiPath = req.path.replace('/api/ai', '');
    const response = await axios.get(`${AI_SERVICE_URL}/api${aiPath}`, { params: req.query });
    res.json(response.data);
  } catch (error: unknown) {
    const axiosError = error as { response?: { status: number; data: unknown } };
    if (axiosError.response) {
      res.status(axiosError.response.status).json(axiosError.response.data);
    } else {
      res.status(500).json({ message: 'AI service unavailable' });
    }
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'NeuroLearn API is running' });
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/neurolearn';

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

export default app;

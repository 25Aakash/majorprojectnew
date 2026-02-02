# NeuroLearn - AI-Powered Adaptive Learning Platform

## Project Overview
NeuroLearn is an adaptive learning platform designed specifically for neurodiverse students (ADHD, autism, dyslexia, etc.). It uses AI to personalize learning experiences based on individual needs.

## Tech Stack
- **Frontend**: React 18 with TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Node.js with Express, REST API
- **Database**: MongoDB with Mongoose ODM
- **AI Service**: Python with FastAPI, scikit-learn, TensorFlow
- **Authentication**: JWT with bcrypt

## Project Structure
```
neurolearn/
├── client/          # React frontend
├── server/          # Node.js backend
├── ai-service/      # Python ML service
└── shared/          # Shared types and utilities
```

## Key Features
1. Personalized learning paths
2. Multi-sensory content delivery
3. Adaptive difficulty adjustment
4. Focus mode and distraction-free UI
5. Progress tracking and analytics
6. Gamification and rewards
7. Parent/Educator dashboard

## Development Commands
- Frontend: `cd client && npm run dev`
- Backend: `cd server && npm run dev`
- AI Service: `cd ai-service && python -m uvicorn main:app --reload`

## Accessibility Standards
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- Customizable themes and fonts

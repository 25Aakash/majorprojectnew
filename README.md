# 🧠 NeuroLearn

## AI-Powered Adaptive Learning Platform for Neurodiverse Students

NeuroLearn is a comprehensive learning platform designed specifically for students with ADHD, autism, dyslexia, and other neurodiverse conditions. It uses AI to personalize learning experiences based on individual needs.

![NeuroLearn Banner](https://via.placeholder.com/1200x400/4F46E5/FFFFFF?text=NeuroLearn+-+Adaptive+Learning)

## ✨ Features

### 🎯 Personalized Learning Paths
- AI-driven content recommendations
- Adaptive difficulty adjustment
- Multi-sensory content delivery (visual, audio, interactive)

### ♿ Accessibility First
- WCAG 2.1 AA compliant
- OpenDyslexic font support
- Text-to-speech integration
- High contrast and dark mode
- Reduced motion option
- Customizable font sizes and line spacing

### 🎮 Gamification & Engagement
- XP points and leveling system
- Achievement badges
- Learning streaks
- Progress tracking

### 🧘 Focus Mode
- Pomodoro-style timer
- Customizable session and break durations
- Distraction-free UI
- Break reminders

### 👨‍👩‍👧 Parent/Educator Dashboard
- Monitor student progress
- View learning analytics
- Receive AI-powered insights
- Track accessibility usage

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Tailwind CSS, Framer Motion |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB with Mongoose |
| AI Service | Python, FastAPI, scikit-learn, TensorFlow |
| Authentication | JWT, bcrypt |

## 📁 Project Structure

```
neurolearn/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React contexts
│   │   ├── layouts/        # Page layouts
│   │   ├── pages/          # Route pages
│   │   ├── services/       # API services
│   │   └── stores/         # Zustand stores
│   └── ...
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # Mongoose models
│   │   └── routes/         # API routes
│   └── ...
├── ai-service/             # Python ML service
│   ├── models/             # ML models
│   ├── services/           # Business logic
│   └── main.py             # FastAPI app
└── shared/                 # Shared types and utilities
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- Python 3.9+
- MongoDB 6+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/neurolearn.git
   cd neurolearn
   ```

2. **Install backend dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Install AI service dependencies**
   ```bash
   cd ../ai-service
   pip install -r requirements.txt
   ```

5. **Configure environment variables**
   ```bash
   cd ../server
   cp .env.example .env
   # Edit .env with your configuration
   ```

### Configuration

Create a `.env` file in the `server` directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/neurolearn
JWT_SECRET=your-super-secret-jwt-key-change-in-production
NODE_ENV=development
```

### Running the Application

**Start MongoDB** (if running locally):
```bash
mongod
```

**Start the backend server**:
```bash
cd server
npm run dev
```

**Start the frontend**:
```bash
cd client
npm run dev
```

**Start the AI service**:
```bash
cd ai-service
python -m uvicorn main:app --reload --port 8000
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- AI Service: http://localhost:8000

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |

### User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/profile` | Get user profile |
| PUT | `/api/users/profile` | Update profile |
| PUT | `/api/users/neurodiverse-profile` | Update neurodiverse settings |
| PUT | `/api/users/accessibility` | Update accessibility settings |

### Course Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/courses` | List all courses |
| GET | `/api/courses/:id` | Get course details |
| POST | `/api/courses/:id/enroll` | Enroll in course |

### AI Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/adapt-content` | Get content adaptation |
| POST | `/api/ai/adjust-difficulty` | Adjust difficulty level |
| POST | `/api/ai/recommend-courses` | Get recommendations |
| POST | `/api/ai/analytics` | Get learning analytics |

## 🎨 Accessibility Features

### Supported Neurodiverse Conditions
- **ADHD**: Shorter sessions, gamification, break reminders
- **Autism**: Structured content, consistent routines, visual learning
- **Dyslexia**: OpenDyslexic font, text-to-speech, audio content
- **Dyscalculia**: Visual math aids, simplified content
- **Dyspraxia**: Larger click targets, keyboard navigation

### Customizable Settings
- Font size (small, medium, large, extra-large)
- Font family (System, Sans-serif, Serif, OpenDyslexic)
- Line spacing (compact, normal, relaxed, loose)
- Color themes (light, dark, sepia, high-contrast)
- Reduced motion
- Text-to-speech

## 🤖 AI Features

### Adaptive Learning Model
- Content variant selection based on profile
- Dynamic difficulty adjustment
- Frustration detection
- Optimal session duration calculation

### Content Recommender
- Personalized course recommendations
- Learning goal alignment
- Prerequisite checking
- Condition-specific matching

### Analytics Service
- Learning pattern analysis
- Progress tracking
- Strength/weakness identification
- Focus pattern analysis

## 🧪 Testing

```bash
# Run backend tests
cd server
npm test

# Run frontend tests
cd client
npm test

# Run AI service tests
cd ai-service
pytest
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [OpenDyslexic Font](https://opendyslexic.org/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Understood.org](https://www.understood.org/) - Resources for neurodiverse learning

## 📞 Support

For support, email support@neurolearn.com or join our Discord community.

---

Made with ❤️ for neurodiverse learners everywhere

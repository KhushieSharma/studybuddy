# StudyBuddy 🧸
**StudyBuddy** is a modern, AI-powered productivity and study companion app built for college students — but flexible enough for coders, readers, freelancers, and lifelong learners.
> Notion + Forest + Duolingo + Pinterest + Spotify focus mode — all in one cozy, aesthetic app.

## 💼 CV / Project Introduction

**StudyBuddy** is a full-stack productivity PWA I built to help students study smarter. It combines a Pomodoro focus timer, AI-powered study recommendations, goal tracking, journaling, analytics, exam monitoring, and a camera-based drowsiness detector. The app uses JWT authentication, MongoDB for data persistence, cron jobs for notifications, and a service worker for offline support and automatic updates across devices.

Built with **React, Vite, Tailwind CSS, Node.js, Express, and MongoDB**, it demonstrates full-stack development, state management, REST API design, real-time notifications, PWA deployment, and computer-vision integration in the browser.

## ✨ Features

- 🔐 JWT Authentication (signup/login/logout)
- 🧸 Cute animated Teddy Companion with emotional states and contextual reactions
- ⏱️ Beautiful Pomodoro / Focus Timer with fullscreen mode, synthesized ambient sounds (Rain, Forest, Lo-Fi), break cycles, and session persistence
- 🎯 Daily / Weekly / Monthly Goals
- 📔 Journaling with mood & productivity tracking
- 📊 Analytics, Weekly Focus Charts, 30-Day Heatmap, and Productivity Insights
- 🎓 Academic Updates & Exam Schedule Monitoring (NIT Kurukshetra)
- 🤖 Smart Recommendations based on study habits, weak subjects, interests, and upcoming exams
- 🏆 Gamification: XP, Levels, Streaks, Achievements
- 🔔 In-App Notification System with cron-generated reminders
- 😴 Focus Guard: camera-based drowsiness detection with sound alerts
- 🎓 Branch/semester dropdown during signup; NIT KKR curriculum subjects auto-loaded for smarter recommendations
- 🛡️ Admin Panel for manual data override and announcements
- 📱 Fully Responsive Design

## 🛠 Tech Stack

**Frontend**
- React + Vite
- Tailwind CSS v4
- Framer Motion
- Zustand
- React Router DOM
- Axios
- Recharts
- Lucide React

**Backend**
- Node.js + Express
- MongoDB + Mongoose
- JWT + bcryptjs
- Cheerio + Axios (scrapers)
- node-cron
- Socket.io
- Winston logging
- Jest + Supertest (testing)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running locally (or MongoDB Atlas URI)

### 1. Install dependencies
```bash
npm run install:all
```

### 2. Environment Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
cd ..
```

### 3. Run the app
```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5000

### 4. Run tests
```bash
npm test
```

### 5. Build for production
```bash
npm run build
```

## 🚀 Deploy to Render (free)

One-click deploy the full app (backend + frontend + MongoDB):

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/KhushieSharma/studybuddy)

After deploy:
1. Create a free **MongoDB Atlas** cluster (or use any MongoDB URI).
2. In the Render dashboard, add an environment variable:
   - `MONGODB_URI` = your MongoDB connection string
3. Render auto-generates `JWT_SECRET`. You can leave it or set your own.
4. Once the service is live, open the Render URL on your phone and install the PWA.

## 📁 Project Structure

```
studybuddy/
├── backend/
│   ├── config/         # Database config
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Auth & error middleware
│   ├── models/         # Mongoose schemas
│   ├── routes/         # API routes
│   ├── services/       # Business logic, scrapers, recommendations, notifications
│   ├── jobs/           # Cron jobs
│   ├── tests/          # Jest tests
│   ├── utils/          # Logger, token generator
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/ # UI components, Teddy, notifications
│   │   ├── pages/      # Page components
│   │   ├── layouts/    # App layout
│   │   ├── store/      # Zustand stores
│   │   ├── services/   # API service layer
│   │   ├── hooks/      # Custom React hooks
│   │   ├── utils/      # Achievements helper
│   │   └── App.jsx
│   └── index.html
└── README.md
```

## 🧸 Teddy Companion

A cute teddy bear (not a bunny!) with sparkles, a bow tie, and toe beans. Teddy reacts to your real activity:
- Celebrates when you hit your daily focus goal
- Gets excited when you are consistently productive
- Motivates you when you have weak subjects or missed goals
- Worries near upcoming exams
- Misses you after inactivity

## 🔔 Notifications

The backend generates notifications for:
- Upcoming exams
- Streak reminders
- Pending daily goals
- Weak subject nudges
- Study reminders after inactivity

## 🛡️ Admin

Users with `role: 'admin'` can access `/admin` to:
- Create/update exams
- Create notices
- Broadcast announcements to all users
- View platform stats

## 😴 Focus Guard

On the Focus page you can enable Focus Guard. It turns on your webcam, loads lightweight face-api.js models, and monitors your eyes. If you close your eyes for too long or look away, it plays a wake-up sound and shows an alert. Video processing happens entirely in your browser.

## 🔮 Future Enhancements

- AI-powered adaptive study plans
- Burnout prediction
- Smart pomodoro timing
- Push notifications
- GPA prediction
- Advanced ML recommendations

---

Made with 💜 for students everywhere.

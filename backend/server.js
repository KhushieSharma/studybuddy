import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

import connectDB from './config/db.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import logger from './utils/logger.js';
import { startScraperJobs } from './jobs/scraperJobs.js';
import { startNotificationJobs } from './jobs/notificationJobs.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import pomodoroRoutes from './routes/pomodoroRoutes.js';
import goalRoutes from './routes/goalRoutes.js';
import journalRoutes from './routes/journalRoutes.js';
import examRoutes from './routes/examRoutes.js';
import noticeRoutes from './routes/noticeRoutes.js';
import markRoutes from './routes/markRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
].filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

connectDB();

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'StudyBuddy API is running 🧸' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/pomodoro', pomodoroRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/marks', markRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', notFound);

if (process.env.NODE_ENV === 'production') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/dist', 'index.html'));
  });
} else {
  app.use(notFound);
}

app.use(errorHandler);

io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);
  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

const startServer = () => {
  httpServer.listen(PORT, () => {
    logger.info(`StudyBuddy server running on port ${PORT}`);
    startScraperJobs();
    startNotificationJobs();
  });
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app, io, startServer };

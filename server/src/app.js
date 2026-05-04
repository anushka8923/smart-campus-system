import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import authRoutes from './modules/auth/auth.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import eventRoutes from './modules/events/event.routes.js';
import hackathonRoutes from './modules/hackathons/hackathon.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';
import recommendationRoutes from './modules/recommendations/recommendation.routes.js';
import registrationRoutes from './modules/registrations/registration.routes.js';
import societyRoutes from './modules/societies/society.routes.js';
import userRoutes from './modules/users/user.routes.js';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'smart-campus-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/hackathons', hackathonRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/societies', societyRoutes);
app.use('/api/users', userRoutes);

app.use(errorHandler);

export default app;

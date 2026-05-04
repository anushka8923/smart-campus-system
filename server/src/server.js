import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { startReminderJob } from './jobs/reminderJob.js';
import { ensureSuperAdmin } from './services/bootstrap.service.js';

await connectDB();
await ensureSuperAdmin();

const server = app.listen(env.PORT, () => {
  console.log(`API running on port ${env.PORT}`);
  startReminderJob();
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${env.PORT} is already in use. Stop the other server or change PORT in server/.env.`);
    process.exit(1);
  }

  throw error;
});

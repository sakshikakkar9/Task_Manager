import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import webpush from 'web-push';
import connectDB from './config/db.js';
import errorHandler from './middleware/errorHandler.js';
import { decrypt } from './utils/crypto.js';

// Models
import Task from './models/Task.js';
import PushSubscription from './models/PushSubscription.js';

// Routes
import taskRoutes from './routes/tasks.js';
import recordRoutes from './routes/records.js';
import pushRoutes from './routes/push.js';
import statsRoutes from './routes/stats.js';

dotenv.config({ path: './.env' });

// Validate required env vars on startup
const required = ['MONGO_URI', 'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_EMAIL', 'ENCRYPTION_KEY'];
for (const key of required) {
  if (!process.env[key] || process.env[key].trim() === '' || process.env[key].startsWith('REPLACE')) {
    console.error(`\n[FATAL] Missing env var: ${key}`);
    process.exit(1);
  }
}
console.log('[OK] All VAPID env vars present');

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);
console.log('[OK] web-push configured with VAPID keys');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/tasks', taskRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/stats', statsRoutes);

app.use(errorHandler);

// THE STABILIZED SCHEDULER ENGINE
function startScheduler() {
  console.log('[Scheduler] Started — Loop successfully initialized.');

  setInterval(async () => {
    try {
      const now = new Date();
      
      // Generate strict local HH:MM comparison parameters
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const currentTime24h = `${hh}:${mm}`;
      
      const yyyy = now.getFullYear();
      const mo = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mo}-${dd}`;

      console.log(`[Scheduler] Tick — Target: ${todayStr} @ ${currentTime24h}`);

      const subs = await PushSubscription.find({}).lean();
      if (!subs.length) {
        console.log('[Scheduler] Alert: No active subscription records discovered in MongoDB.');
        return;
      }

      // Query database for matching incomplete items
      const pending = await Task.find({
        date: todayStr,
        completed: false,
        reminderSent: false,
        deadline: { $exists: true, $ne: null, $ne: '' }
      }).lean();

      if (pending.length > 0) {
        console.log(`[Scheduler] Evaluating ${pending.length} unnotified tasks against ${subs.length} push tokens...`);
      }

      for (const task of pending) {
        let taskTitle = task.title;
        try { taskTitle = decrypt(task.title); } catch (e) {}

        // --- UPDATED TIME ZONE NORMALIZATION LAYER ---
        let taskTime24h = '';
        try {
          const rawDeadline = task.deadline.trim();

          // Case A: If it's a full ISO String (e.g. "2026-05-23T03:33:00.000Z")
          if (rawDeadline.includes('T')) {
            const dateObj = new Date(rawDeadline);
            // Extract local system hours and minutes matching your machine clock
            const taskHH = String(dateObj.getHours()).padStart(2, '0');
            const taskMM = String(dateObj.getMinutes()).padStart(2, '0');
            taskTime24h = `${taskHH}:${taskMM}`;
          } 
          // Case B: Standard 12-hour format string (e.g. "08:39 PM")
          else if (rawDeadline.toUpperCase().includes('AM') || rawDeadline.toUpperCase().includes('PM')) {
            const [timePart, ampm] = rawDeadline.split(' ');
            let [hours, minutes] = timePart.split(':').map(Number);
            if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
            if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
            taskTime24h = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
          } 
          // Case C: Standard 24-hour format string (e.g. "20:39")
          else {
            const [hours, minutes] = rawDeadline.split(':');
            taskTime24h = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
          }
        } catch (err) {
          console.error(`[Scheduler] Skipped time parsing for task "${taskTitle}" due to invalid format:`, task.deadline);
          continue;
        }

        console.log(`[Scheduler] Checking Task: "${taskTitle}" | Task Time: ${taskTime24h} vs Current Time: ${currentTime24h}`);

        // Compare standard match strings directly
        if (currentTime24h === taskTime24h) {
          console.log(`[Scheduler] 🎯 MATCH FOUND! Preparing payload distribution for "${taskTitle}"`);

          const payload = JSON.stringify({
            title: 'DayFlow Task Due! ⏰',
            body: `Your task "${taskTitle}" is scheduled for right now!`,
            taskId: task._id.toString(),
            playBeep: true
          });

          for (const sub of subs) {
            try {
              const endpoint = sub.endpoint;
              const p256dh = sub.keys?.p256dh || sub.p256dh;
              const auth = sub.keys?.auth || sub.auth;

              if (!endpoint || !p256dh || !auth) {
                console.error('[Scheduler] Skipping invalid subscription structure entry:', sub._id);
                continue;
              }

              await webpush.sendNotification(
                { endpoint, keys: { p256dh, auth } },
                payload
              );
              
              console.log(`[Scheduler] ✓ Notification successfully pushed to client terminal`);
            } catch (pushErr) {
              console.error(`[Scheduler] ✗ Endpoint delivery failed:`, pushErr.statusCode);
              if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
                await PushSubscription.deleteOne({ _id: sub._id });
                console.log('[Scheduler] Pruned dead/expired browser registration token');
              }
            }
          }

          // Flag database context complete
          await Task.findByIdAndUpdate(task._id, { reminderSent: true });
        }
      }
    } catch (loopErr) {
      console.error('[Scheduler CRITICAL SYSTEM BLOCK ERROR]:', loopErr);
    }
  }, 60000);
}

// Start sequence validation hooks
connectDB()
  .then(() => {
    startScheduler();
    app.listen(process.env.PORT || 5000, () => {
      console.log(`[Server] Running on http://localhost:${process.env.PORT || 5000}`);
    });
  })
  .catch(err => {
    console.error('[Startup] MongoDB connection failed:', err.message);
    process.exit(1);
  });
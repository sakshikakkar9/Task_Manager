import express from 'express';
import Task from '../models/Task.js';

const router = express.Router();

// @desc    Get task statistics and streak
// @route   GET /api/stats
router.get('/', async (req, res, next) => {
  try {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mo = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const todayStr = `${yyyy}-${mo}-${dd}`

    const todayTotal = await Task.countDocuments({ date: todayStr })
    const todayCompleted = await Task.countDocuments({ date: todayStr, completed: true })
    const totalAllTime = await Task.countDocuments({ completed: true })

    const completionRate = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0

    // CORRECT STREAK LOGIC:
    // 1. Fetch all distinct dates that have at least 1 completed task:
    const completedDates = await Task.distinct('date', { completed: true });

    // 2. Sort these dates descending (newest first) using Date object comparison:
    completedDates.sort((a, b) => new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00'));

    // 3. Count streak starting from today or yesterday:
    let streak = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    for (const dateStr of completedDates) {
      const d = new Date(dateStr + 'T00:00:00');
      const diffDays = Math.round((checkDate - d) / 86400000);

      if (diffDays === 0 || diffDays === 1) {
        streak++;
        checkDate = d; // move window back one day
      } else {
        break; // gap found, streak ends
      }
    }

    // 4. Return streak in stats response.
    res.json({
      todayTotal,
      todayCompleted,
      completionRate,
      totalAllTime,
      streak
    });
  } catch (error) {
    next(error);
  }
});

export default router;

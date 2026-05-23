import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import Task from '../models/Task.js';
import { decryptTask } from '../utils/crypto.js';

const router = express.Router();

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'backend/uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

// File filter for images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter,
});

// @desc    Get all tasks for a specific date
// @route   GET /api/tasks
router.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const tasks = await Task.find({ date: targetDate }).sort({ deadline: 1 }).lean();

    // Decrypt each task
    const decryptedTasks = tasks.map(t => decryptTask(t));

    res.json(decryptedTasks);
  } catch (error) {
    console.error('[Tasks] GET error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc    Create a new task
// @route   POST /api/tasks
router.post('/', upload.single('image'), async (req, res, next) => {
  try {
    const { title, date, deadline, priority } = req.body;

    if (!title || !date) {
      return res.status(400).json({ success: false, error: 'Title and date are required' });
    }

    const taskData = {
      title,
      date,
      deadline,
      priority,
    };

    if (req.file) {
      taskData.imageUrl = `/uploads/${req.file.filename}`;
    }

    const task = await Task.create(taskData);
    res.status(201).json(decryptTask(task));
  } catch (error) {
    next(error);
  }
});

// @desc    Mark task as completed
// @route   PATCH /api/tasks/:id/complete
router.patch('/:id/complete', async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { completed: true, completedAt: new Date() },
      { new: true }
    ).lean();

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    res.json(decryptTask(task));
  } catch (error) {
    console.error('[Tasks] PATCH complete error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    if (task.imageUrl) {
      const filePath = path.join(process.cwd(), 'backend', task.imageUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await task.deleteOne();
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;

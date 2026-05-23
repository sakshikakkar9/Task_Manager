import mongoose from 'mongoose';
import crypto from 'crypto'; 
import { decryptTask } from '../utils/crypto.js'; 

const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) throw new Error('ENCRYPTION_KEY is not defined');
  return crypto.createHash('sha256').update(secret).digest();
}

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  date: {
    type: String,
    required: true,
  },
  deadline: {
    type: String,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  imageUrl: {
    type: String,
    default: null,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  reminderSent: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      // 1. Safely decrypt the scrambled database data for the frontend UI
      const decrypted = decryptTask(ret);
      
      ret.id = ret._id ? ret._id.toString() : ret.id;
      ret.title = decrypted.title;
      ret.imageUrl = decrypted.imageUrl;
      
      // 2. Map image field for frontend compatibility
      if (decrypted.image) {
        ret.image = decrypted.image;
      } else if (ret.imageUrl) {
        ret.image = ret.imageUrl.startsWith('/uploads/')
          ? ret.imageUrl.replace('/uploads/', '')
          : ret.imageUrl;
      }
      
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// A. Pre-Save Interceptor: Encrypt cleartext fields before storing them in MongoDB
taskSchema.pre('save', async function () {
  let key;
  try {
    key = getKey();
  } catch (err) {
    // If there's an error, we throw it directly in an async function
    throw err; 
  }

  // Encrypt Title
  if (this.isModified('title') && typeof this.title === 'string' && this.title.trim() !== '') {
    if (!this.title.includes(':')) {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
      let encrypted = cipher.update(this.title, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');
      
      this.title = `${iv.toString('hex')}:${authTag}:${encrypted}`;
    }
  }

  // Encrypt ImageUrl
  if (this.isModified('imageUrl') && typeof this.imageUrl === 'string' && this.imageUrl.trim() !== '') {
    if (!this.imageUrl.includes(':')) {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
      let encrypted = cipher.update(this.imageUrl, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');
      
      this.imageUrl = `${iv.toString('hex')}:${authTag}:${encrypted}`;
    }
  }

  // NOTE: Notice there is NO next() called here. 
  // Mongoose automatically knows the middleware is done when the async function finishes executing!
});

const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);

export default Task;
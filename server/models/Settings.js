import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    default: 'config',
    unique: true
  },
  defaultAverageTime: {
    type: Number,
    default: 8 // default fallback in minutes
  }
}, {
  timestamps: true
});

export default mongoose.model('Settings', settingsSchema);

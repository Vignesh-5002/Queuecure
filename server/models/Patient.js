import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema({
  tokenNumber: {
    type: Number,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: Number,
    required: true
  },
  consultationType: {
    type: String,
    default: 'General'
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'completed', 'skipped'],
    default: 'waiting',
    index: true
  },
  checkInTime: {
    type: Date,
    default: Date.now
  },
  startConsultation: {
    type: Date
  },
  endConsultation: {
    type: Date
  },
  consultationDuration: {
    type: Number // stored in minutes
  }
}, {
  timestamps: true
});

export default mongoose.model('Patient', patientSchema);

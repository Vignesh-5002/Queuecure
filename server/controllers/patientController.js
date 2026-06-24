import Patient from '../models/Patient.js';
import Settings from '../models/Settings.js';

// Simple in-memory mutex lock for queue changes to prevent race conditions
let isProcessingNext = false;

// Helper to get or create settings
async function getSettings() {
  let settings = await Settings.findOne({ key: 'config' });
  if (!settings) {
    settings = await Settings.create({ key: 'config', defaultAverageTime: 8 });
  }
  return settings;
}

// Helper to calculate dynamic average consultation time
async function calculateDynamicAverage(defaultVal) {
  try {
    // Get all completed patients for today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const completedToday = await Patient.find({
      status: 'completed',
      endConsultation: { $gte: startOfDay }
    });

    if (completedToday.length === 0) {
      return defaultVal;
    }

    const totalDuration = completedToday.reduce((sum, p) => sum + (p.consultationDuration || 0), 0);
    const average = totalDuration / completedToday.length;
    
    // Round to 1 decimal place
    return Math.round(average * 10) / 10;
  } catch (error) {
    console.error('Error calculating dynamic average:', error);
    return defaultVal;
  }
}

// Get entire queue state
export const getQueue = async (req, res) => {
  try {
    const settings = await getSettings();
    const dynamicAverage = await calculateDynamicAverage(settings.defaultAverageTime);

    // Get patients sorted by token
    const patients = await Patient.find({
      status: { $in: ['waiting', 'active'] }
    }).sort({ tokenNumber: 1 });

    // Get recently completed or skipped patients (e.g. last 10)
    const recentActivity = await Patient.find({
      status: { $in: ['completed', 'skipped'] }
    }).sort({ updatedAt: -1 }).limit(10);

    res.json({
      success: true,
      patients,
      recentActivity,
      settings: {
        defaultAverageTime: settings.defaultAverageTime,
        dynamicAverageTime: dynamicAverage
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add patient to queue
export const addPatient = async (req, res) => {
  try {
    const { name, age, consultationType } = req.body;
    if (!name || !age) {
      return res.status(400).json({ success: false, message: 'Name and Age are required' });
    }

    // Atomic token generation: Find max token number today and add 1
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const lastPatient = await Patient.findOne({
      createdAt: { $gte: startOfDay }
    }).sort({ tokenNumber: -1 });

    const tokenNumber = lastPatient ? lastPatient.tokenNumber + 1 : 1;

    const patient = await Patient.create({
      tokenNumber,
      name,
      age,
      consultationType: consultationType || 'General',
      status: 'waiting',
      checkInTime: new Date()
    });

    // Notify clients via Socket.IO (will be handled in server.js/io instance)
    if (req.app.get('io')) {
      req.app.get('io').emit('queueUpdated');
    }

    res.status(201).json({ success: true, patient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Call next patient
export const callNext = async (req, res) => {
  if (isProcessingNext) {
    return res.status(429).json({ success: false, message: 'Another request is currently modifying the queue' });
  }

  isProcessingNext = true;

  try {
    const now = new Date();

    // 1. Find active patient and complete them
    const activePatient = await Patient.findOne({ status: 'active' });
    if (activePatient) {
      activePatient.status = 'completed';
      activePatient.endConsultation = now;
      
      // Calculate duration in minutes (round up to nearest 0.1 min, min 0.1 min)
      if (activePatient.startConsultation) {
        const diffMs = now - activePatient.startConsultation;
        const durationMin = Math.max(0.1, Math.round((diffMs / 60000) * 10) / 10);
        activePatient.consultationDuration = durationMin;
      } else {
        activePatient.consultationDuration = 1.0; // default fallback if start wasn't recorded
      }
      await activePatient.save();
    }

    // 2. Find next waiting patient (lowest token number)
    const nextPatient = await Patient.findOne({ status: 'waiting' }).sort({ tokenNumber: 1 });
    if (nextPatient) {
      nextPatient.status = 'active';
      nextPatient.startConsultation = now;
      await nextPatient.save();
    }

    // Emit event
    if (req.app.get('io')) {
      req.app.get('io').emit('queueUpdated');
    }

    res.json({
      success: true,
      message: nextPatient ? `Called Token ${nextPatient.tokenNumber}` : 'No patients in waiting queue',
      activePatient: nextPatient || null
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    isProcessingNext = false;
  }
};

// Skip a patient
export const skipPatient = async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await Patient.findById(id);
    if (!patient) {
      return res.status(444).json({ success: false, message: 'Patient not found' });
    }

    if (patient.status === 'active') {
      patient.endConsultation = new Date();
      patient.consultationDuration = 0; // skipped active doesn't count towards average
    }
    
    patient.status = 'skipped';
    await patient.save();

    if (req.app.get('io')) {
      req.app.get('io').emit('queueUpdated');
    }

    res.json({ success: true, patient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update global configuration settings (default average wait time)
export const updateSettings = async (req, res) => {
  try {
    const { defaultAverageTime } = req.body;
    if (defaultAverageTime === undefined || isNaN(defaultAverageTime)) {
      return res.status(400).json({ success: false, message: 'Invalid average time value' });
    }

    const settings = await getSettings();
    settings.defaultAverageTime = Number(defaultAverageTime);
    await settings.save();

    if (req.app.get('io')) {
      req.app.get('io').emit('queueUpdated');
      req.app.get('io').emit('averageTimeChanged', settings.defaultAverageTime);
    }

    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Complete active patient's consultation without calling next
export const completeActive = async (req, res) => {
  try {
    const activePatient = await Patient.findOne({ status: 'active' });
    if (!activePatient) {
      return res.status(400).json({ success: false, message: 'No patient is currently active/being served' });
    }

    const now = new Date();
    activePatient.status = 'completed';
    activePatient.endConsultation = now;

    if (activePatient.startConsultation) {
      const diffMs = now - activePatient.startConsultation;
      const durationMin = Math.max(0.1, Math.round((diffMs / 60000) * 10) / 10);
      activePatient.consultationDuration = durationMin;
    } else {
      activePatient.consultationDuration = 1.0;
    }
    await activePatient.save();

    if (req.app.get('io')) {
      req.app.get('io').emit('queueUpdated');
    }

    res.json({
      success: true,
      message: `Completed consultation for Token ${activePatient.tokenNumber}`,
      patient: activePatient
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


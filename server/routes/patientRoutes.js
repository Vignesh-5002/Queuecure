import express from 'express';
import {
  getQueue,
  addPatient,
  callNext,
  skipPatient,
  updateSettings,
  completeActive
} from '../controllers/patientController.js';

const router = express.Router();

router.get('/patients', getQueue);
router.post('/patients', addPatient);
router.put('/patients/next', callNext);
router.put('/patients/active/complete', completeActive);
router.put('/patients/:id/skip', skipPatient);
router.put('/settings', updateSettings);

export default router;

import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const getQueue = async () => {
  const response = await api.get('/patients');
  return response.data;
};

export const addPatient = async (patientData) => {
  const response = await api.post('/patients', patientData);
  return response.data;
};

export const callNext = async () => {
  const response = await api.put('/patients/next');
  return response.data;
};

export const completeActive = async () => {
  const response = await api.put('/patients/active/complete');
  return response.data;
};

export const skipPatient = async (id) => {
  const response = await api.put(`/patients/${id}/skip`);
  return response.data;
};

export const updateSettings = async (settingsData) => {
  const response = await api.put('/settings', settingsData);
  return response.data;
};

export default api;

import React, { useState, useEffect } from 'react';
import { getQueue, addPatient, callNext, skipPatient, updateSettings, completeActive } from '../services/api';
import { socket } from '../services/socket';
import { UserPlus, Play, Users, Clock, Settings, UserMinus, PlusCircle, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';

export default function Reception() {
  const [queue, setQueue] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [settings, setSettings] = useState({ defaultAverageTime: 8, dynamicAverageTime: 8 });
  
  // Form states
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [consultationType, setConsultationType] = useState('General');
  const [avgTimeInput, setAvgTimeInput] = useState('8');
  
  // Interface states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchQueueData = async () => {
    try {
      const data = await getQueue();
      if (data.success) {
        setQueue(data.patients);
        setRecentActivity(data.recentActivity);
        setSettings(data.settings);
        setAvgTimeInput(data.settings.defaultAverageTime.toString());
      }
    } catch (err) {
      setError('Failed to fetch queue data from server');
      console.error(err);
    }
  };

  useEffect(() => {
    fetchQueueData();

    // Listen for realtime updates
    socket.on('queueUpdated', () => {
      fetchQueueData();
    });

    socket.on('averageTimeChanged', (newTime) => {
      setSettings(prev => ({ ...prev, defaultAverageTime: newTime }));
      setAvgTimeInput(newTime.toString());
    });

    return () => {
      socket.off('queueUpdated');
      socket.off('averageTimeChanged');
    };
  }, []);

  const handleAddPatient = async (e) => {
    e.preventDefault();
    if (!name.trim() || !age) {
      setError('Please fill in Name and Age');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await addPatient({ name, age: Number(age), consultationType });
      if (res.success) {
        setSuccess(`Successfully added ${name} (Token: ${res.patient.tokenNumber})`);
        setName('');
        setAge('');
        setConsultationType('General');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error adding patient');
    } finally {
      setLoading(false);
    }
  };

  const handleCallNext = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await callNext();
      if (res.success) {
        setSuccess(res.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error calling next patient');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteActive = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await completeActive();
      if (res.success) {
        setSuccess(res.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error completing consultation');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipPatient = async (id, name) => {
    setError('');
    setSuccess('');
    try {
      const res = await skipPatient(id);
      if (res.success) {
        setSuccess(`Skipped patient ${name}`);
      }
    } catch (err) {
      setError('Error skipping patient');
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await updateSettings({ defaultAverageTime: Number(avgTimeInput) });
      if (res.success) {
        setSuccess('Average consultation time configuration updated');
      }
    } catch (err) {
      setError('Error updating configuration');
    }
  };

  const activePatient = queue.find(p => p.status === 'active');
  const waitingPatients = queue.filter(p => p.status === 'waiting');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header section */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-3 rounded-xl text-white shadow-lg shadow-indigo-600/30">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Queue Cure</h1>
              <p className="text-slate-400 text-sm">Receptionist Command Center</p>
            </div>
          </div>
          <button 
            onClick={fetchQueueData}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </header>

        {/* Top summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Active Patient Card */}
          <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-md relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
            <p className="text-indigo-400 font-semibold text-xs tracking-wider uppercase">Currently Serving</p>
            {activePatient ? (
              <div className="mt-4">
                <div className="text-4xl font-extrabold text-white">Token #{activePatient.tokenNumber}</div>
                <div className="mt-2 text-lg font-medium text-slate-200">{activePatient.name} ({activePatient.age}y)</div>
                <span className="inline-block mt-2 px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs font-semibold rounded-full border border-indigo-500/30">
                  {activePatient.consultationType}
                </span>
              </div>
            ) : (
              <div className="mt-6 text-slate-400 text-sm italic">No active patient right now</div>
            )}
          </div>

          {/* Average Consultation Times */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
            <p className="text-slate-400 font-semibold text-xs tracking-wider uppercase">Consultation Settings</p>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-slate-400 text-xs">Standard Default</p>
                <div className="text-2xl font-bold text-white mt-1">{settings.defaultAverageTime}m</div>
              </div>
              <div>
                <p className="text-indigo-400 text-xs flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Dynamic Avg
                </p>
                <div className="text-2xl font-bold text-indigo-400 mt-1">{settings.dynamicAverageTime}m</div>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">Dynamic average updates on completed sessions.</p>
          </div>

          {/* Waiting Count */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
            <p className="text-slate-400 font-semibold text-xs tracking-wider uppercase">Queue Density</p>
            <div className="mt-4">
              <div className="text-4xl font-extrabold text-emerald-400">{waitingPatients.length}</div>
              <p className="text-slate-400 text-sm mt-2">Patients waiting in line</p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-950/60 border border-red-500/30 text-red-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 p-4 bg-emerald-950/60 border border-emerald-500/30 text-emerald-200 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
            <p className="text-sm">{success}</p>
          </div>
        )}

        {/* Main interactive grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1 & 2: Queue Table & Action */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Action Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">Next Patient Control</h3>
                <p className="text-slate-400 text-sm">Manage active serving session and call next patients.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <button
                  onClick={handleCompleteActive}
                  disabled={loading || !activePatient}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-850 disabled:text-slate-500 disabled:border-slate-800 disabled:cursor-not-allowed font-semibold text-white rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 hover:-translate-y-0.5 active:translate-y-0 transition-all border border-emerald-500/20 cursor-pointer"
                >
                  <CheckCircle className="w-5 h-5" />
                  COMPLETE SERVING
                </button>
                <button
                  onClick={handleCallNext}
                  disabled={loading || waitingPatients.length === 0}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-850 disabled:text-slate-500 disabled:border-slate-800 disabled:cursor-not-allowed font-semibold text-white rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 hover:-translate-y-0.5 active:translate-y-0 transition-all border border-indigo-500/20 cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-current" />
                  CALL NEXT PATIENT
                </button>
              </div>
            </div>

            {/* Waiting Queue Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-md overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  Upcoming Queue
                </h2>
                <span className="px-2.5 py-0.5 bg-slate-800 text-slate-300 text-xs font-semibold rounded-full">
                  Sorted by Priority
                </span>
              </div>
              
              <div className="overflow-x-auto">
                {waitingPatients.length > 0 ? (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/50 text-slate-400 text-xs font-semibold tracking-wider uppercase border-b border-slate-800">
                        <th className="p-4 pl-6">Token</th>
                        <th className="p-4">Name</th>
                        <th className="p-4">Age</th>
                        <th className="p-4">Department</th>
                        <th className="p-4 text-right pr-6">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {waitingPatients.map((p) => (
                        <tr key={p._id} className="hover:bg-slate-800/35 transition">
                          <td className="p-4 pl-6">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 text-indigo-400 font-bold border border-slate-700/50">
                              {p.tokenNumber}
                            </span>
                          </td>
                          <td className="p-4 font-medium text-slate-200">{p.name}</td>
                          <td className="p-4 text-slate-400">{p.age} yrs</td>
                          <td className="p-4 text-slate-400">
                            <span className="px-2 py-1 bg-slate-850 text-xs rounded border border-slate-800">
                              {p.consultationType}
                            </span>
                          </td>
                          <td className="p-4 text-right pr-6">
                            <button
                              onClick={() => handleSkipPatient(p._id, p.name)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-red-950/40 hover:text-red-400 text-slate-400 hover:border-red-900/50 text-xs font-medium rounded-lg border border-slate-750 transition"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                              Skip Patient
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-12 text-center text-slate-500 italic">
                    The waiting queue is currently empty.
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-md overflow-hidden">
              <div className="p-6 border-b border-slate-800">
                <h2 className="text-lg font-bold text-white">Recent Activity History</h2>
              </div>
              <div className="p-4 divide-y divide-slate-850">
                {recentActivity.length > 0 ? (
                  recentActivity.map((p) => (
                    <div key={p._id} className="flex justify-between items-center py-3 text-sm">
                      <div>
                        <span className="font-semibold text-slate-350">Token {p.tokenNumber}</span>
                        <span className="text-slate-300 ml-2">{p.name}</span>
                        <span className="text-slate-500 text-xs ml-2">({p.consultationType})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {p.status === 'completed' ? (
                          <>
                            <span className="text-slate-500 text-xs">Served: {p.consultationDuration} min</span>
                            <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 text-xs rounded border border-emerald-900/40">
                              Completed
                            </span>
                          </>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-950 text-amber-500 text-xs rounded border border-slate-900">
                            Skipped
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-slate-550 text-xs italic">No activity recorded yet</div>
                )}
              </div>
            </div>

          </div>

          {/* Column 3: Sidebar Forms (Add Patient & Settings) */}
          <div className="space-y-6">
            
            {/* Add Patient Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-400" />
                Register New Patient
              </h2>
              <form onSubmit={handleAddPatient} className="space-y-4">
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter patient name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-650 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold uppercase mb-1">Age</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="125"
                      placeholder="e.g. 30"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-650 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold uppercase mb-1">Dept</label>
                    <select
                      value={consultationType}
                      onChange={(e) => setConsultationType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition"
                    >
                      <option value="General">General</option>
                      <option value="Pediatrics">Pediatrics</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Orthopedic">Orthopedic</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 font-semibold text-white rounded-xl shadow-md transition disabled:bg-slate-800"
                >
                  <UserPlus className="w-5 h-5" />
                  Register Patient
                </button>
              </form>
            </div>

            {/* Quick Settings Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" />
                Queue Parameters
              </h2>
              <form onSubmit={handleUpdateSettings} className="space-y-4">
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase mb-1">
                    Fallback Average Time (mins)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={avgTimeInput}
                      onChange={(e) => setAvgTimeInput(e.target.value)}
                      className="w-24 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-center focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition"
                    />
                    <button
                      type="submit"
                      className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold rounded-xl text-sm transition"
                    >
                      Update Fallback
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Used as the initial calculation baseline before real doctor speed data is logged.
                  </p>
                </div>
              </form>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

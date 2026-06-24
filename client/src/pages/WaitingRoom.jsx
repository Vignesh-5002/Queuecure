import React, { useState, useEffect } from 'react';
import { getQueue } from '../services/api';
import { socket } from '../services/socket';
import { Clock, Users, Tv, CheckCircle, Hourglass, HelpCircle } from 'lucide-react';

export default function WaitingRoom() {
  const [queue, setQueue] = useState([]);
  const [settings, setSettings] = useState({ defaultAverageTime: 8, dynamicAverageTime: 8 });
  const [myTokenInput, setMyTokenInput] = useState('');
  const [trackedToken, setTrackedToken] = useState(null);

  const fetchQueueData = async () => {
    try {
      const data = await getQueue();
      if (data.success) {
        setQueue(data.patients);
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Failed to fetch queue data:', err);
    }
  };

  useEffect(() => {
    fetchQueueData();

    socket.on('queueUpdated', () => {
      fetchQueueData();
    });

    socket.on('averageTimeChanged', (newTime) => {
      setSettings(prev => ({ ...prev, defaultAverageTime: newTime }));
    });

    return () => {
      socket.off('queueUpdated');
      socket.off('averageTimeChanged');
    };
  }, []);

  const activePatient = queue.find(p => p.status === 'active');
  const waitingPatients = queue.filter(p => p.status === 'waiting');

  // Find position and estimate wait time
  const handleTrackToken = (e) => {
    e.preventDefault();
    if (!myTokenInput.trim()) return;
    setTrackedToken(parseInt(myTokenInput, 10));
  };

  const getTrackedDetails = () => {
    if (!trackedToken) return null;

    // Check if token exists in waiting queue
    const waitingIndex = waitingPatients.findIndex(p => p.tokenNumber === trackedToken);
    
    // Check if token is the active one
    const isActive = activePatient && activePatient.tokenNumber === trackedToken;

    if (isActive) {
      return {
        status: 'active',
        tokensAhead: 0,
        estimatedWait: 0
      };
    }

    if (waitingIndex !== -1) {
      const tokensAhead = waitingIndex; // Index in sorted waiting list is number of people ahead
      // wait time = tokens ahead * average consultation time
      // using dynamic average consultation time
      const avgTime = settings.dynamicAverageTime || settings.defaultAverageTime || 8;
      const estimatedWait = tokensAhead * avgTime;

      return {
        status: 'waiting',
        tokensAhead,
        estimatedWait: Math.round(estimatedWait)
      };
    }

    // Check if completed/skipped
    return {
      status: 'not-in-queue'
    };
  };

  const trackingInfo = getTrackedDetails();
  const avgTime = settings.dynamicAverageTime || settings.defaultAverageTime || 8;

  return (
    <div className="min-h-screen bg-[#060b13] text-slate-100 p-6 flex flex-col font-sans">
      
      {/* Header bar */}
      <header className="max-w-6xl w-full mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-4 border-b border-slate-900 mb-8">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping absolute"></div>
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500"></div>
          </div>
          <span className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Live Queue Display</span>
        </div>
        <div className="text-left sm:text-right">
          <h2 className="text-lg font-bold text-white tracking-wide">Queue Cure Waiting Lounge</h2>
          <p className="text-xs text-slate-500">Updates instantly • Do not refresh</p>
        </div>
      </header>

      <main className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
        
        {/* Left 2 Columns: Main Board */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* NOW SERVING BOARD */}
          <div className="bg-gradient-to-b from-indigo-950/20 to-slate-950 border-2 border-indigo-500/40 rounded-3xl p-8 text-center relative overflow-hidden shadow-2xl shadow-indigo-900/10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1.5 bg-indigo-500 rounded-b-full"></div>
            
            <span className="text-xs font-bold tracking-widest text-indigo-400 uppercase">Now Serving</span>
            
            {activePatient ? (
              <div className="mt-6 space-y-4">
                <div className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-white tracking-tight animate-pulse drop-shadow-[0_0_25px_rgba(99,102,241,0.25)]">
                  TOKEN {activePatient.tokenNumber}
                </div>
                <div className="text-xl md:text-2xl font-semibold text-slate-200">
                  {activePatient.name}
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-900/40 border border-indigo-700/30 rounded-full text-indigo-300 text-sm font-medium">
                  <Hourglass className="w-4 h-4 animate-spin" />
                  Consultation in Progress
                </div>
              </div>
            ) : (
              <div className="py-12 space-y-4">
                <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-400">Waiting for Patient</div>
                <p className="text-slate-500 max-w-md mx-auto text-sm">
                  The consulting room is currently ready. Next patient will be summoned shortly.
                </p>
              </div>
            )}
          </div>

          {/* HORIZONTAL QUEUE CAROUSEL / TIMELINE */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              Up Next in Queue ({waitingPatients.length} Waiting)
            </h3>
            
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              {waitingPatients.length > 0 ? (
                waitingPatients.map((p, index) => (
                  <div 
                    key={p._id}
                    className={`flex-shrink-0 w-36 bg-slate-900/60 border rounded-2xl p-4 flex flex-col items-center justify-between text-center relative ${
                      index === 0 ? 'border-indigo-500/35 bg-indigo-950/10' : 'border-slate-800/80'
                    }`}
                  >
                    {index === 0 && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-indigo-500 text-[10px] font-bold text-white rounded-full">
                        NEXT
                      </span>
                    )}
                    <span className="text-2xl font-extrabold text-white">#{p.tokenNumber}</span>
                    <span className="text-xs font-semibold text-slate-300 truncate w-full mt-2">{p.name}</span>
                    <span className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">{p.consultationType}</span>
                    <span className="text-[10px] text-indigo-400 font-medium mt-3 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      ~{index * avgTime} min
                    </span>
                  </div>
                ))
              ) : (
                <div className="w-full py-8 text-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-2xl">
                  No upcoming tokens scheduled.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right 1 Column: Personal Token Check & Queue Stats */}
        <div className="space-y-8">
          
          {/* TRACK YOUR TOKEN CARD */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">Track Your Wait Time</h3>
              <p className="text-slate-400 text-xs mt-1">
                Enter your assigned token number to view your real-time spot and wait estimation.
              </p>
            </div>

            <form onSubmit={handleTrackToken} className="flex flex-col sm:flex-row gap-2">
              <input
                type="number"
                placeholder="Token e.g. 24"
                value={myTokenInput}
                onChange={(e) => setMyTokenInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-center font-bold placeholder-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
              <button 
                type="submit" 
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl transition-all w-full sm:w-auto cursor-pointer"
              >
                Track
              </button>
            </form>

            {/* TRACKING RESULTS */}
            {trackedToken && trackingInfo && (
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-850/80 space-y-4">
                {trackingInfo.status === 'active' && (
                  <div className="text-center space-y-2 py-2">
                    <div className="inline-flex p-3 bg-indigo-950 text-indigo-400 rounded-full border border-indigo-900/50 mb-1 animate-bounce">
                      <Tv className="w-6 h-6" />
                    </div>
                    <h4 className="text-lg font-bold text-indigo-400">It's Your Turn!</h4>
                    <p className="text-xs text-slate-400">Please proceed directly to the consulting room now.</p>
                  </div>
                )}

                {trackingInfo.status === 'waiting' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm border-b border-slate-905/40 pb-2">
                      <span className="text-slate-400">Your Status</span>
                      <span className="font-semibold text-indigo-400 uppercase tracking-wide text-xs">Waiting</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-slate-905/40 pb-2">
                      <span className="text-slate-400">Tokens Ahead</span>
                      <span className="font-extrabold text-white text-lg">{trackingInfo.tokensAhead}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400">Estimated Wait</span>
                      <span className="font-extrabold text-emerald-400 text-lg flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {trackingInfo.estimatedWait} mins
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 text-center mt-2">
                      Based on current average consultation speed of {avgTime} mins per patient.
                    </p>
                  </div>
                )}

                {trackingInfo.status === 'not-in-queue' && (
                  <div className="text-center space-y-2 py-2">
                    <div className="inline-flex p-3 bg-slate-900 text-amber-500 rounded-full border border-slate-800">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-amber-500">Token Not in Active Queue</h4>
                    <p className="text-xs text-slate-400">
                      Token #{trackedToken} may have already been served, skipped, or has not been registered yet. Check with reception.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* QUEUE INSIGHTS CARD */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Lounge Insights</h4>
            <div className="space-y-3 text-sm text-slate-400">
              <div className="flex justify-between">
                <span>Average Consultation Rate:</span>
                <span className="font-semibold text-white">{avgTime}m / patient</span>
              </div>
              <div className="flex justify-between">
                <span>Total Registered Today:</span>
                <span className="font-semibold text-white">
                  {queue.length + (activePatient ? 1 : 0) + (waitingPatients.length ? waitingPatients.length : 0)}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 leading-relaxed border-t border-slate-850 pt-3">
                Wait times are calculated dynamically based on recent completed consultation durations to guarantee maximum precision.
              </div>
            </div>
          </div>

        </div>

      </main>

      {/* Footer message */}
      <footer className="max-w-6xl w-full mx-auto py-8 text-center text-xs text-slate-650 mt-12 border-t border-slate-905/30">
        © 2026 Queue Cure Clinic Management System • Connected to database via Cluster0
      </footer>

    </div>
  );
}

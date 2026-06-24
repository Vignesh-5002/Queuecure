import { useState, useEffect } from 'react';
import Reception from './pages/Reception';
import WaitingRoom from './pages/WaitingRoom';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.hash || '#reception');

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash || '#reception');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Dynamic top routing bar for demo convenience */}
      <div className="bg-slate-900 border-b border-slate-800 text-xs px-6 py-3 sm:py-2 flex flex-col sm:flex-row justify-between items-center gap-2 z-50">
        <span className="text-slate-400 font-medium">Queue Cure Navigation:</span>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
          <a 
            href="#reception" 
            className={`px-3 py-1 rounded transition ${
              currentPath === '#reception' 
                ? 'bg-indigo-600 text-white font-semibold' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Receptionist Dashboard
          </a>
          <a 
            href="#waiting" 
            className={`px-3 py-1 rounded transition ${
              currentPath === '#waiting' 
                ? 'bg-indigo-600 text-white font-semibold' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Patient Waiting Room
          </a>
        </div>
      </div>

      <div className="flex-1">
        {currentPath === '#waiting' ? <WaitingRoom /> : <Reception />}
      </div>
    </div>
  );
}

export default App;

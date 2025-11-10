import { useState } from 'react';
import { HomePage } from './components/HomePage';
import { FaultReporting } from './components/FaultReporting';
import { ReportHistory } from './components/ReportHistory';
import { Navigation } from './components/Navigation';
import { SplashScreen } from './components/SplashScreen';

type View = 'home' | 'report' | 'history';
type FaultType = 'Water' | 'Electricity' | 'Roads' | 'Waste';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentView, setCurrentView] = useState<View>('home');
  const [selectedFaultType, setSelectedFaultType] = useState<FaultType | null>(null);

  const handleNavigate = (view: View, faultType?: FaultType) => {
    setCurrentView(view);
    if (faultType) {
      setSelectedFaultType(faultType);
    } else if (view !== 'report') {
      setSelectedFaultType(null);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <HomePage onNavigate={handleNavigate} />;
      case 'report':
        return <FaultReporting initialFaultType={selectedFaultType} />;
      case 'history':
        return <ReportHistory />;
      default:
        return <HomePage onNavigate={handleNavigate} />;
    }
  };

  // Show splash screen on first load
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {renderView()}
      <Navigation currentView={currentView} onNavigate={(view) => handleNavigate(view)} />
    </div>
  );
}

export default App;


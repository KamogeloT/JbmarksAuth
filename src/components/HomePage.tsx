import React from 'react';
import { WaterIcon, PowerIcon, RoadIcon, TrashIcon, PhoneIcon, MailIcon, ListIcon, PlusIcon } from './icons';
import { config } from '../config';

type FaultType = 'Water' | 'Electricity' | 'Roads' | 'Waste';

interface HomePageProps {
  onNavigate: (view: 'report' | 'history', faultType?: FaultType) => void;
}

const FeatureCard: React.FC<{ icon: React.ElementType, title: string, description: string, onClick: () => void }> = ({ icon: Icon, title, description, onClick }) => (
  <button
    onClick={onClick}
    className="bg-light-DEFAULT rounded-lg shadow-md p-4 flex flex-col items-center justify-center space-y-2 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 text-center"
  >
    <div className="bg-secondary-dark rounded-full p-3">
      <Icon className="h-7 w-7 text-primary-dark" />
    </div>
    <span className="text-primary-dark font-semibold text-sm">{title}</span>
    <p className="text-gray-600 text-xs px-2">{description}</p>
  </button>
);

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  // Use version from config instead of Capacitor for consistency
  const appVersion = `v${config.app.version}`;
  const versionCode = config.app.versionCode;

  const features: Array<{ id: string; title: string; faultType: FaultType; icon: React.FC<{ className?: string }>; description: string }> = [
    { id: 'water', title: 'Water & Sanitation', faultType: 'Water', icon: WaterIcon, description: 'Leaks, blockages, supply issues.' },
    { id: 'electricity', title: 'Electricity', faultType: 'Electricity', icon: PowerIcon, description: 'Outages, faulty lights, hazards.' },
    { id: 'roads', title: 'Roads & Stormwater', faultType: 'Roads', icon: RoadIcon, description: 'Potholes, signs, drain issues.' },
    { id: 'waste', title: 'Refuse & Waste', faultType: 'Waste', icon: TrashIcon, description: 'Missed collections, illegal dumping.' },
  ];

  return (
    <div className="min-h-screen bg-secondary-DEFAULT pb-20">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-dark to-primary-light text-white text-center py-12 px-6">
        <div className="flex items-center justify-center mb-6">
          <img 
            src="/assets/images/logos/JBMArkslogo.png" 
            alt="JBmarks Local Municipality" 
            className="h-20 w-auto"
          />
        </div>
        <h1 className="text-4xl font-extrabold mb-2">{config.app.name}</h1>
        <p className="text-white text-lg mt-2 opacity-90">Streamlining Municipal Service Delivery</p>
      </div>

      {/* How It Works */}
      <div className="py-12 px-6">
        <h2 className="text-2xl font-bold text-center text-primary-dark mb-8">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div className="flex flex-col items-center">
            <div className="bg-primary-light text-white rounded-full h-16 w-16 flex items-center justify-center font-bold text-2xl mb-4">1</div>
            <h3 className="font-semibold text-lg text-primary-dark">Select Category</h3>
            <p className="text-gray-600 text-sm">Choose the type of issue you want to report.</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="bg-primary-light text-white rounded-full h-16 w-16 flex items-center justify-center font-bold text-2xl mb-4">2</div>
            <h3 className="font-semibold text-lg text-primary-dark">Provide Details</h3>
            <p className="text-gray-600 text-sm">Fill in the form, add a photo, and set the location.</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="bg-primary-light text-white rounded-full h-16 w-16 flex items-center justify-center font-bold text-2xl mb-4">3</div>
            <h3 className="font-semibold text-lg text-primary-dark">Submit & Track</h3>
            <p className="text-gray-600 text-sm">Get a reference number and track the status.</p>
          </div>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="px-6 mb-8">
        <h2 className="text-2xl font-bold text-center text-primary-dark mb-8">What You Can Report</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map(feature => (
            <FeatureCard
              key={feature.id}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              onClick={() => onNavigate('report', feature.faultType)}
            />
          ))}
        </div>
      </div>

      {/* Action Cards */}
      <div className="px-6 space-y-4">
        <button
          onClick={() => onNavigate('report')}
          className="w-full text-white rounded-lg shadow-xl p-6 flex items-center justify-between transition-all duration-300 border-2 border-primary-dark"
          style={{ backgroundColor: '#2E7D32' }}
        >
          <div className="flex items-center space-x-4">
            <PlusIcon className="h-6 w-6 text-white" />
            <h3 className="font-extrabold text-lg text-white">Report New Issue</h3>
          </div>
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>

        <button
          onClick={() => onNavigate('history')}
          className="w-full text-white rounded-lg shadow-xl p-6 flex items-center justify-between transition-all duration-300 border-2 border-primary-dark"
          style={{ backgroundColor: '#2E7D32' }}
        >
          <div className="flex items-center space-x-4">
            <ListIcon className="h-6 w-6 text-white" />
            <h3 className="font-extrabold text-lg text-white">My Reports</h3>
          </div>
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Contact Section */}
      <div className="px-6 mt-12 text-center">
        <h3 className="font-bold text-lg text-primary-dark mb-4">Emergency Contacts</h3>
        <div className="space-y-3">
          <a href={`tel:${config.app.supportPhone}`} className="flex items-center justify-center space-x-3 text-primary-dark hover:text-primary-light transition-colors">
            <PhoneIcon className="h-5 w-5" />
            <span>{config.app.supportPhone}</span>
          </a>
          <a href={`mailto:${config.app.supportEmail}`} className="flex items-center justify-center space-x-3 text-primary-dark hover:text-primary-light transition-colors">
            <MailIcon className="h-5 w-5" />
            <span>{config.app.supportEmail}</span>
          </a>
        </div>
      </div>

      {/* Powered by SDinMotion Footer */}
      <div className="bg-white border-t border-gray-200 py-4 mt-12">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-gray-600">Powered by</span>
            <img 
              src="/assets/images/logos/SdinMotionlogo.png" 
              alt="SDinMotion" 
              className="h-6 w-auto"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="px-2 py-1 bg-gray-100 rounded-md font-mono">
              {appVersion}
            </span>
            <span className="text-gray-400">•</span>
            <span>Build {versionCode}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;

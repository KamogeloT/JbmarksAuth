import React from 'react';
import { HomeIcon, ListIcon, PlusIcon } from './icons';

interface NavigationProps {
  currentView: 'home' | 'report' | 'history' | 'track' | 'feed' | 'emergency' | 'announcements';
  onNavigate: (view: 'home' | 'report' | 'history' | 'track' | 'feed' | 'emergency' | 'announcements') => void;
}

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

export const Navigation: React.FC<NavigationProps> = ({ currentView, onNavigate }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex justify-around items-center h-16">
          <button
            onClick={() => onNavigate('home')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              currentView === 'home'
                ? 'text-green-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <HomeIcon className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">Home</span>
          </button>

          <button
            onClick={() => onNavigate('report')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              currentView === 'report'
                ? 'text-green-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className={`rounded-full p-2 mb-1 ${
              currentView === 'report'
                ? 'bg-green-700 text-white'
                : 'bg-gray-100'
            }`}>
              <PlusIcon className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium">Report</span>
          </button>

          <button
            onClick={() => onNavigate('track')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              currentView === 'track'
                ? 'text-green-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <SearchIcon className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">Track</span>
          </button>

          <button
            onClick={() => onNavigate('history')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              currentView === 'history'
                ? 'text-green-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ListIcon className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">History</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

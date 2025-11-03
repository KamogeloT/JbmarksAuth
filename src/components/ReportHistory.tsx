import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { FaultReport } from '../types';
import { CheckCircleIcon, XCircleIcon, ClockIcon, WaterIcon, PowerIcon, RoadIcon, TrashIcon, RefreshIcon, AlertIcon } from './icons';
import { bitrix24Service } from '../services/bitrix24Service';

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'submitted':
      return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
    case 'failed':
      return <XCircleIcon className="h-6 w-6 text-red-500" />;
    case 'pending':
      return <ClockIcon className="h-6 w-6 text-yellow-500" />;
    default:
      return <AlertIcon className="h-6 w-6 text-gray-500" />;
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'submitted':
      return 'Submitted';
    case 'failed':
      return 'Failed';
    case 'pending':
      return 'Pending';
    case 'draft':
      return 'Draft';
    default:
      return 'Unknown';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'submitted':
      return 'bg-green-100 text-green-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'draft':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getCategoryIcon = (formType: string) => {
  switch (formType) {
    case 'Water':
      return <WaterIcon className="h-5 w-5" />;
    case 'Electricity':
      return <PowerIcon className="h-5 w-5" />;
    case 'Roads':
      return <RoadIcon className="h-5 w-5" />;
    case 'Waste':
      return <TrashIcon className="h-5 w-5" />;
    default:
      return null;
  }
};

const ReportCard: React.FC<{ 
  report: FaultReport; 
  onRetry: (report: FaultReport) => void;
  onDelete: (id: string) => void;
}> = ({ report, onRetry, onDelete }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-md mb-4 overflow-hidden border border-gray-200">
      <div 
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2 flex-1">
            <div className="text-brand-blue">
              {getCategoryIcon(report.formType)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                {report.specificField || report.formType}
              </h3>
              <p className="text-xs text-gray-500 truncate">
                {report.address}
              </p>
            </div>
          </div>
          {getStatusIcon(report.status)}
        </div>

        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
            {getStatusText(report.status)}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(report.createdAt).toLocaleDateString('en-ZA')}
          </span>
        </div>

        <div className="mt-2 bg-blue-50 rounded px-3 py-2">
          <p className="text-xs font-medium text-blue-900">
            Ref: {report.refNumber}
          </p>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50 animate-slide-up">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-500">Reported By</p>
              <p className="text-sm text-gray-900">{report.fullName}</p>
              <p className="text-sm text-gray-600">{report.contactNumber}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500">Description</p>
              <p className="text-sm text-gray-900">{report.details}</p>
            </div>

            {report.taskId && (
              <div>
                <p className="text-xs font-medium text-gray-500">Task ID</p>
                <p className="text-sm text-gray-900">{report.taskId}</p>
              </div>
            )}

            {report.error && (
              <div className="bg-red-50 border border-red-200 rounded p-2">
                <p className="text-xs font-medium text-red-800">Error</p>
                <p className="text-xs text-red-700">{report.error}</p>
              </div>
            )}

            <div className="flex space-x-2 pt-2">
              {report.status === 'failed' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetry(report);
                  }}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 border-2 border-primary-dark text-sm font-bold rounded-lg text-white transition-colors"
                  style={{ backgroundColor: '#2E7D32' }}
                >
                  <RefreshIcon className="h-4 w-4 mr-1" />
                  Retry
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this report?')) {
                    onDelete(report.id!);
                  }
                }}
                className="flex-1 inline-flex items-center justify-center px-3 py-2 border-2 border-red-600 text-sm font-bold rounded-lg text-white transition-colors"
                style={{ backgroundColor: '#DC2626' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ReportHistory: React.FC = () => {
  const [reports, setReports] = useState<FaultReport[]>([]);
  const [filter, setFilter] = useState<'all' | 'submitted' | 'failed' | 'pending'>('all');
  const [retrying, setRetrying] = useState(false);

  const loadReports = () => {
    const allReports = storageService.getAllReports();
    setReports(allReports);
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleRetry = async (report: FaultReport) => {
    setRetrying(true);
    
    try {
      const taskResult = await bitrix24Service.createTaskFromFault(report);
      
      if (taskResult.success && taskResult.taskId) {
        report.taskId = taskResult.taskId;
        report.status = 'submitted';
        report.submittedAt = new Date().toISOString();
        report.error = undefined;

        // Upload file if present
        if (report.photoFile && taskResult.taskId) {
          await bitrix24Service.uploadFile(report.photoFile, taskResult.taskId, report.formType);
        }

        storageService.saveReport(report);
        loadReports();
        alert('Report submitted successfully!');
      } else {
        alert(`Failed to submit: ${taskResult.error}`);
      }
    } catch (error) {
      alert('Network error. Please try again later.');
    } finally {
      setRetrying(false);
    }
  };

  const handleDelete = (id: string) => {
    storageService.deleteReport(id);
    loadReports();
  };

  const filteredReports = reports.filter(report => {
    if (filter === 'all') return true;
    return report.status === filter;
  });

  const storageInfo = storageService.getStorageInfo();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="text-white px-4 py-6 shadow-lg" style={{ backgroundColor: '#2E7D32' }}>
        <h1 className="text-2xl font-bold text-center">My Reports</h1>
        <p className="text-center text-white opacity-90 text-sm mt-2">
          {storageInfo.count} report{storageInfo.count !== 1 ? 's' : ''} • {storageInfo.size}
        </p>
      </div>

      <div className="sticky top-0 z-10 bg-white shadow-md px-4 py-3">
        <div className="flex space-x-2 overflow-x-auto">
          {(['all', 'submitted', 'failed', 'pending'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors border-2 ${
                filter === status
                  ? 'border-primary-dark'
                  : 'border-gray-300'
              }`}
              style={{ backgroundColor: filter === status ? '#2E7D32' : '#F3F4F6', color: filter === status ? 'white' : '#374151' }}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status === 'all' && ` (${reports.length})`}
              {status !== 'all' && ` (${reports.filter(r => r.status === status).length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {retrying && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800 flex items-center">
              <RefreshIcon className="h-5 w-5 mr-2 animate-spin" />
              Retrying submission...
            </p>
          </div>
        )}

        {filteredReports.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <AlertIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-500">
              {filter === 'all' 
                ? 'No reports yet. Submit your first report!'
                : `No ${filter} reports.`
              }
            </p>
          </div>
        ) : (
          filteredReports.map(report => (
            <ReportCard
              key={report.id}
              report={report}
              onRetry={handleRetry}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Powered by SDinMotion Footer */}
      <div className="bg-white border-t border-gray-200 py-4 mt-12 mb-20">
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-gray-600">Powered by</span>
          <img 
            src="/assets/images/logos/SdinMotionlogo.png" 
            alt="SDinMotion" 
            className="h-6 w-auto"
          />
        </div>
      </div>

      {reports.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <button
            onClick={() => {
              if (confirm('Clear all report history? This cannot be undone.')) {
                storageService.clearAllReports();
                loadReports();
              }
            }}
            className="w-full max-w-2xl mx-auto block px-4 py-3 border-2 border-red-600 text-sm font-bold rounded-lg text-white hover:bg-red-700 transition-colors"
            style={{ backgroundColor: '#DC2626' }}
          >
            Clear All History
          </button>
        </div>
      )}
    </div>
  );
};

export default ReportHistory;


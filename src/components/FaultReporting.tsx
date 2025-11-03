import React, { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import { WaterIcon, PowerIcon, RoadIcon, TrashIcon, LocationMarkerIcon, CameraIcon, CheckCircleIcon } from './icons';
import { bitrix24Service } from '../services/bitrix24Service';
import { storageService } from '../services/storageService';
import { FaultReport } from '../types';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';
type FaultType = 'Water' | 'Electricity' | 'Roads' | 'Waste';

const FormField: React.FC<{ 
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
}> = ({ id, label, type = 'text', required = true, value, onChange, placeholder }) => (
  <div className="mb-4">
    <label htmlFor={id} className="block text-base font-semibold text-gray-900 mb-2">
      {label} {required && <span className="text-danger-DEFAULT font-bold">*</span>}
    </label>
    <input
      type={type}
      name={id}
      id={id}
      required={required}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-4 py-3 text-base font-medium text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-DEFAULT focus:border-primary-DEFAULT transition-all duration-200"
    />
  </div>
);

const SelectField: React.FC<{ 
  id: string;
  label: string;
  required?: boolean;
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
}> = ({ id, label, required = true, value, onChange, children }) => (
  <div className="mb-4">
    <label htmlFor={id} className="block text-base font-semibold text-gray-900 mb-2">
      {label} {required && <span className="text-danger-DEFAULT font-bold">*</span>}
    </label>
    <select
      id={id}
      name={id}
      required={required}
      value={value}
      onChange={onChange}
      className="w-full px-4 py-3 text-base font-medium text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-DEFAULT focus:border-primary-DEFAULT transition-all duration-200"
    >
      {children}
    </select>
  </div>
);

const LocationInput: React.FC<{ 
  address: string;
  setAddress: (value: string) => void;
}> = ({ address, setAddress }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGetLocation = async () => {
    setLoading(true);
    setError('');
    
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });
      const { latitude, longitude } = position.coords;
      setAddress(`Lat: ${latitude.toFixed(5)}, Lon: ${longitude.toFixed(5)}`);
    } catch (err) {
      console.error('Error getting location:', err);
      setError('Unable to retrieve your location. Please grant permission or enter manually.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="mb-4">
      <label htmlFor="address" className="block text-base font-semibold text-gray-900 mb-2">
        Location / Address <span className="text-danger-DEFAULT font-bold">*</span>
      </label>
      <textarea
        id="address"
        name="address"
        rows={3}
        required
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="e.g., 123 Main Street, near the post office."
        className="w-full px-4 py-3 text-base font-medium text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-DEFAULT focus:border-primary-DEFAULT transition-all duration-200"
      />
      {error && <p className="mt-2 text-sm font-semibold text-danger-DEFAULT">{error}</p>}
      <button
        type="button"
        onClick={handleGetLocation}
        disabled={loading}
        className="mt-3 w-full inline-flex items-center justify-center px-4 py-3 border-2 border-primary-dark shadow-md text-base font-bold rounded-lg text-white hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light disabled:opacity-50 transition-all duration-200"
        style={{ backgroundColor: loading ? '#9CA3AF' : '#2E7D32' }}
      >
        <LocationMarkerIcon className="mr-2 h-5 w-5 text-white" />
        {loading ? 'Getting Location...' : 'Use My Current Location'}
      </button>
    </div>
  );
};

const FileInput: React.FC<{ 
  file: File | null;
  setFile: (file: File | null) => void;
}> = ({ file, setFile }) => {
  const [preview, setPreview] = useState<string | null>(null);

  const handleCameraCapture = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
        promptLabelHeader: 'Select Photo Source',
        promptLabelPhoto: 'From Gallery',
        promptLabelPicture: 'Take Photo'
      });

      if (image.dataUrl) {
        setPreview(image.dataUrl);
        
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        const fileName = `photo_${Date.now()}.${image.format}`;
        const photoFile = new File([blob], fileName, { type: `image/${image.format}` });
        setFile(photoFile);
      }
    } catch (err) {
      console.error('Error capturing photo:', err);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
  };

  return (
    <div className="mb-4">
      <label className="block text-base font-semibold text-gray-900 mb-2">
        Upload Photo (Optional)
      </label>
      
      {!preview ? (
        <div className="border-2 border-dashed border-gray-400 rounded-lg p-6 hover:border-primary-DEFAULT bg-gray-50 transition-all duration-200">
          <div className="text-center">
            <CameraIcon className="mx-auto h-12 w-12 text-primary-DEFAULT mb-3" />
            <button
              type="button"
              onClick={handleCameraCapture}
              className="w-full mb-3 inline-flex items-center justify-center px-4 py-3 border-2 border-primary-dark shadow-md text-base font-bold rounded-lg text-white hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light transition-all duration-200"
              style={{ backgroundColor: '#2E7D32' }}
            >
              <CameraIcon className="mr-2 h-5 w-5" />
              Take Photo or Upload
            </button>
            <p className="text-sm font-medium text-gray-600">
              PNG, JPG, GIF up to 10MB
            </p>
          </div>
        </div>
      ) : (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover rounded-lg shadow-md"
          />
          <button
            type="button"
            onClick={removeFile}
            className="absolute top-2 right-2 text-white rounded-full p-2 transition-colors duration-300 border-2 border-red-700"
            style={{ backgroundColor: '#DC2626' }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {file && (
            <p className="mt-2 text-sm text-gray-600 truncate">
              {file.name}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

interface FaultFormProps {
  formType: FaultType;
  onSuccess: (report: FaultReport) => void;
}

const FaultForm: React.FC<FaultFormProps> = ({ formType, onSuccess }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    contactNumber: '',
    email: '',
    specificField: '',
    details: '',
  });
  const [address, setAddress] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const draft = storageService.getDraft();
    if (draft && draft.formType === formType) {
      setFormData({
        fullName: draft.fullName || '',
        contactNumber: draft.contactNumber || '',
        email: draft.email || '',
        specificField: draft.specificField || '',
        details: draft.details || '',
      });
      setAddress(draft.address || '');
    }
  }, [formType]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.fullName || formData.details) {
        storageService.saveDraft({
          ...formData,
          address,
          formType,
        });
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [formData, address, formType]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    const reportId = storageService.generateId();
    const refNumber = storageService.generateRefNumber();

    const report: FaultReport = {
      id: reportId,
      refNumber,
      fullName: formData.fullName,
      contactNumber: formData.contactNumber,
      email: formData.email,
      formType,
      specificField: formData.specificField,
      address,
      details: formData.details,
      photoFile: file || undefined,
      photo: file?.name,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    storageService.saveReport(report);

    try {
      const taskResult = await bitrix24Service.createTaskFromFault(report);

      if (taskResult.success && taskResult.taskId) {
        report.taskId = taskResult.taskId;
        report.status = 'submitted';
        report.submittedAt = new Date().toISOString();

        // Handle file upload with detailed feedback
        if (file && taskResult.taskId) {
          console.log('🔄 Starting file upload...');
          alert(`Task created successfully! Task ID: ${taskResult.taskId}\n\nNow uploading photo...`);
          
          const uploadResult = await bitrix24Service.uploadFile(file, taskResult.taskId, formType);
          
          if (uploadResult.success) {
            console.log('✅ File upload SUCCESS!');
            alert(`✅ SUCCESS!\n\nTask created: ${taskResult.taskId}\nPhoto uploaded: ${uploadResult.fileId}\n\nYour report has been submitted successfully!`);
          } else {
            console.error('❌ File upload FAILED:', uploadResult.error);
            alert(`⚠️ PARTIAL SUCCESS\n\nTask created: ${taskResult.taskId}\n\nBUT photo upload FAILED:\n${uploadResult.error}\n\nThe task was created but without the photo. Please check the console for details.`);
            
            // Store error for debugging
            report.error = `Photo upload failed: ${uploadResult.error}`;
          }
        } else {
          alert(`✅ Task created successfully!\n\nTask ID: ${taskResult.taskId}\n\n(No photo was attached)`);
        }

        storageService.saveReport(report);
        storageService.clearDraft();

        setStatus('success');
        onSuccess(report);
      } else {
        report.status = 'failed';
        report.error = taskResult.error || 'Failed to create task';
        storageService.saveReport(report);
        
        setStatus('error');
        setErrorMessage(taskResult.error || 'Failed to submit report');
      }
    } catch (error) {
      report.status = 'failed';
      report.error = 'Network error';
      storageService.saveReport(report);

      setStatus('error');
      setErrorMessage('Network error. Your report has been saved and will be retried.');
    }
  };

  if (status === 'success') {
    return null;
  }

  const issueOptions = {
    Water: ['Burst Pipe', 'Leaking Water Meter', 'No Water Supply', 'Sewer Blockage / Overflow', 'Low Water Pressure', 'Other'],
    Electricity: ['Power Outage', 'Faulty Street Light', 'Illegal Connection', 'Damaged Electrical Box or Pole', 'Low Voltage', 'Other'],
    Roads: ['Pothole', 'Damaged Road Sign', 'Blocked Stormwater Drain', 'Faulty Traffic Light', 'Faded Road Markings', 'Other'],
    Waste: ['Missed Refuse Collection', 'Illegal Dumping', 'Request New Bin', 'Damaged Bin', 'Other'],
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      <FormField
        id="fullName"
        label="Full Name"
        value={formData.fullName}
        onChange={handleChange}
        placeholder="John Doe"
      />

      <FormField
        id="contactNumber"
        label="Contact Number"
        type="tel"
        value={formData.contactNumber}
        onChange={handleChange}
        placeholder="082 123 4567"
      />

      <FormField
        id="email"
        label="Email Address"
        type="email"
        required={false}
        value={formData.email}
        onChange={handleChange}
        placeholder="you@example.com"
      />

      <SelectField
        id="specificField"
        label="Type of Issue"
        value={formData.specificField}
        onChange={handleChange}
      >
        <option value="">Select an issue...</option>
        {issueOptions[formType].map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </SelectField>

      <LocationInput address={address} setAddress={setAddress} />

      <div className="mb-4">
        <label htmlFor="details" className="block text-base font-semibold text-gray-900 mb-2">
          Detailed Description <span className="text-danger-DEFAULT font-bold">*</span>
        </label>
        <textarea
          id="details"
          name="details"
          rows={4}
          required
          value={formData.details}
          onChange={handleChange}
          placeholder="Describe the issue in detail..."
          className="w-full px-4 py-3 text-base font-medium text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-DEFAULT focus:border-primary-DEFAULT transition-all duration-200"
        />
      </div>

      <FileInput file={file} setFile={setFile} />

      {status === 'error' && (
        <div className="bg-danger-light border border-danger-DEFAULT rounded-lg p-4 mb-4">
          <p className="text-sm text-danger-dark">
            <strong>Error:</strong> {errorMessage}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full flex justify-center items-center py-4 px-4 border-2 rounded-lg shadow-xl text-lg font-extrabold text-white hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        style={{ 
          backgroundColor: status === 'submitting' ? '#9CA3AF' : '#388E3C',
          borderColor: '#2E7D32'
        }}
      >
        {status === 'submitting' ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Submitting...
          </>
        ) : (
          'Submit Report'
        )}
      </button>
    </form>
  );
};

const SuccessScreen: React.FC<{ report: FaultReport; onNewReport: () => void }> = ({ report, onNewReport }) => (
  <div className="text-center p-6 animate-fade-in">
    <div className="mb-6">
      <CheckCircleIcon className="mx-auto h-20 w-20 text-success-DEFAULT" />
    </div>
    
    <h3 className="text-2xl font-bold text-success-DEFAULT mb-4">
      Report Submitted!
    </h3>
    
    <p className="text-gray-600 mb-6">
      Your report has been logged.
    </p>
    
    <div className="bg-primary-light border border-primary-dark rounded-lg p-4 mb-6">
      <p className="text-sm font-medium text-gray-700 mb-2">
        Your Reference Number:
      </p>
      <p className="text-2xl font-bold text-primary-dark">
        {report.refNumber}
      </p>
    </div>
    
    <button
      onClick={onNewReport}
      className="w-full py-4 px-4 text-white font-bold rounded-lg shadow-lg transition-all duration-300 border-2 border-primary-dark"
      style={{ backgroundColor: '#2E7D32' }}
    >
      Report Another Issue
    </button>
  </div>
);

interface FaultReportingProps {
  initialFaultType?: FaultType | null;
}

export const FaultReporting: React.FC<FaultReportingProps> = ({ initialFaultType }) => {
  const [activeTab, setActiveTab] = useState<FaultType>(initialFaultType || 'Water');
  const [successReport, setSuccessReport] = useState<FaultReport | null>(null);

  const tabs: Array<{ id: FaultType; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'Water', label: 'Water', icon: WaterIcon },
    { id: 'Electricity', label: 'Electricity', icon: PowerIcon },
    { id: 'Roads', label: 'Roads', icon: RoadIcon },
    { id: 'Waste', label: 'Waste', icon: TrashIcon },
  ];

  const handleSuccess = (report: FaultReport) => {
    setSuccessReport(report);
  };

  const handleNewReport = () => {
    setSuccessReport(null);
  };

  if (successReport) {
    return (
      <div className="min-h-screen bg-light-DEFAULT">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <SuccessScreen report={successReport} onNewReport={handleNewReport} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-DEFAULT">
      <div className="bg-gradient-to-r from-primary-dark to-primary-light text-white px-4 py-6 shadow-lg">
        <div className="flex items-center justify-center mb-4">
          <img 
            src="/assets/images/logos/JBMArkslogo.png" 
            alt="JBmarks Local Municipality" 
            className="h-16 w-auto"
          />
        </div>
        <h1 className="text-2xl font-bold text-center">Report an Issue</h1>
        <p className="text-center text-white text-sm mt-2 opacity-90">
          Select a category to begin
        </p>
      </div>

      <div className="sticky top-0 z-10 bg-white shadow-md">
        <div className="flex overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[80px] py-4 px-2 text-sm font-bold border-b-4 transition-colors duration-300 ${
                activeTab === tab.id
                  ? 'border-accent-DEFAULT'
                  : 'border-transparent hover:bg-gray-100'
              }`}
              style={{ 
                backgroundColor: activeTab === tab.id ? '#C8E6C9' : 'transparent',
                color: activeTab === tab.id ? '#1B5E20' : '#6B7280'
              }}
            >
              <div style={{ color: activeTab === tab.id ? '#2E7D32' : '#9CA3AF' }}>
                <tab.icon className={`mx-auto h-6 w-6 mb-1`} />
              </div>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-light-DEFAULT rounded-lg shadow-lg p-6">
          <FaultForm key={activeTab} formType={activeTab} onSuccess={handleSuccess} />
        </div>
      </div>

      {/* Powered by SDinMotion Footer */}
      <div className="bg-white border-t border-gray-200 py-4 mt-8">
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-gray-600">Powered by</span>
          <img 
            src="/assets/images/logos/SdinMotionlogo.png" 
            alt="SDinMotion" 
            className="h-6 w-auto"
          />
        </div>
      </div>
    </div>
  );
};

export default FaultReporting;

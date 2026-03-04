// Type definitions for the Fault Reporting Mobile App

export interface FaultReport {
  id?: string; // Local ID for tracking
  refNumber: string;
  fullName: string;
  contactNumber: string;
  email?: string;
  formType: 'Water' | 'Electricity' | 'Roads' | 'Waste';
  specificField: string;
  area?: 'Township' | 'Town'; // Area type selection
  city?: 'Ventersdorp' | 'Potchefstroom'; // City selection
  address: string;
  details: string;
  photo?: string;
  photoFile?: File;
  status: 'draft' | 'pending' | 'submitted' | 'failed';
  taskId?: string; // Bitrix24 task ID
  createdAt: string;
  submittedAt?: string;
  error?: string;
}

export interface Bitrix24Task {
  TITLE: string;
  DESCRIPTION: string;
  RESPONSIBLE_ID: string;
  CREATED_BY: string;
  GROUP_ID?: string;
  STAGE_ID?: string;
  PRIORITY?: string;
  DEADLINE?: string;
  UF_CRM_TASK?: string;
}

export interface SubmitResult {
  success: boolean;
  taskId?: string;
  error?: string;
}

export interface FileUploadResult {
  success: boolean;
  fileId?: string;
  error?: string;
}


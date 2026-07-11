/**
 * Represents a department-to-Bitrix-workgroup mapping.
 */
export interface Department {
  id: number;
  departmentCode: string;
  departmentName: string;
  bitrixWorkgroupId: number;
  bitrixDriveId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Extended department mapping information including validation state.
 */
export interface DepartmentMapping extends Department {
  isValidated?: boolean;
  lastValidatedAt?: string;
}

/**
 * Request payload for creating a new department mapping.
 */
export interface CreateDepartmentRequest {
  departmentCode: string;
  departmentName: string;
  bitrixWorkgroupId: number;
  bitrixDriveId: number;
}

/**
 * Request payload for updating an existing department mapping.
 */
export interface UpdateDepartmentRequest {
  departmentName?: string;
  bitrixWorkgroupId?: number;
  bitrixDriveId?: number;
  isActive?: boolean;
}

/**
 * Represents the current user profile returned from GET /auth/me.
 */
export interface UserProfile {
  id: number;
  bitrixUserId: number;
  email: string;
  fullName: string;
  departmentCode: string | null;
  maxClassificationLevel: number;
  roles: string[];
  isActive: boolean;
}

/**
 * Available system roles matching the backend role definitions.
 */
export enum UserRole {
  SystemAdministrator = 'System_Administrator',
  RecordsManager = 'Records_Manager',
  RegistryClerk = 'Registry_Clerk',
  DepartmentUser = 'Department_User',
  DepartmentSupervisor = 'Department_Supervisor',
  ComplianceOfficer = 'Compliance_Officer',
  Auditor = 'Auditor',
  Archivist = 'Archivist',
  ExecutiveViewer = 'Executive_Viewer'
}

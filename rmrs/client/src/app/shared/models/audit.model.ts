/**
 * Represents an immutable audit log entry.
 */
export interface AuditLog {
  id: number;
  userId: number;
  timestamp: string;
  actionType: string;
  entityType: string;
  entityId: number;
  previousValue: string | null;
  newValue: string | null;
  sourceIpAddress: string;
}

/**
 * Query parameters for filtering audit log entries.
 */
export interface AuditQuery {
  userId?: number;
  entityType?: string;
  entityId?: number;
  actionType?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Compliance metrics summary returned from the compliance dashboard endpoint.
 */
export interface ComplianceMetrics {
  pendingDisposals: number;
  overdueDisposals: number;
  recordsApproachingExpiry: number;
  filePlanCoverage: number;
  totalActiveRecords: number;
  totalArchivedRecords: number;
}

/**
 * Status values for a disposal batch workflow.
 */
export type DisposalBatchStatus = 'Initiated' | 'Approved' | 'Executed' | 'Failed';

/**
 * Status values for individual records within a disposal batch.
 */
export type DisposalRecordStatus = 'Pending' | 'Disposed' | 'Failed';

/**
 * Represents a disposal batch grouping records for disposal processing.
 */
export interface DisposalBatch {
  id: number;
  batchNumber: string;
  disposalAuthorityRef: string;
  status: DisposalBatchStatus;
  initiatedByUserId: number;
  approvedByUserId: number | null;
  initiatedAt: string;
  approvedAt: string | null;
  executedAt: string | null;
  certificateGenerated: boolean;
}

/**
 * Represents a record that is a candidate for disposal.
 */
export interface DisposalCandidate {
  recordId: number;
  registryNumber: string;
  subject: string;
  departmentCode: string;
  retentionExpiryDate: string;
  filePlanClassificationCode: string;
}

/**
 * Represents a generated disposal certificate.
 */
export interface DisposalCertificate {
  id: number;
  disposalBatchId: number;
  certificateNumber: string;
  generatedAt: string;
}

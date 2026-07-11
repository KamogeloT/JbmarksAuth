/**
 * Record types supported by the registry.
 */
export type RecordType = 'Incoming' | 'Outgoing' | 'Internal';

/**
 * Possible statuses for a record throughout its lifecycle.
 */
export type RecordStatus =
  | 'Active'
  | 'DisposalPending'
  | 'Disposed'
  | 'Archived'
  | 'TransferPending';

/**
 * Represents a registered record in the system.
 */
export interface Record {
  id: number;
  registryNumber: string;
  recordType: RecordType;
  subject: string;
  senderOrRecipient: string | null;
  dateReceivedOrSent: string;
  filePlanEntryId: number;
  classificationLevel: number;
  responsibleOfficerId: number;
  departmentId: number;
  externalReferenceNumber: string | null;
  originatingOrganization: string | null;
  correspondenceDate: string | null;
  status: RecordStatus;
  retentionExpiryDate: string | null;
  createdByUserId: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request payload for registering an incoming record.
 */
export interface RegisterIncomingRequest {
  subject: string;
  senderOrRecipient: string;
  dateReceivedOrSent: string;
  filePlanClassificationCode: string;
  responsibleOfficerId: number;
  classificationLevelOverride?: number;
  externalReferenceNumber: string;
  originatingOrganization: string;
  correspondenceDate: string;
}

/**
 * Request payload for registering an outgoing record.
 */
export interface RegisterOutgoingRequest {
  subject: string;
  senderOrRecipient: string;
  dateReceivedOrSent: string;
  filePlanClassificationCode: string;
  responsibleOfficerId: number;
  classificationLevelOverride?: number;
}

/**
 * Request payload for registering an internal record.
 */
export interface RegisterInternalRequest {
  subject: string;
  senderOrRecipient: string;
  dateReceivedOrSent: string;
  filePlanClassificationCode: string;
  responsibleOfficerId: number;
  classificationLevelOverride?: number;
}

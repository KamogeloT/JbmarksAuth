/**
 * Represents an electronic document linked to a record.
 */
export interface Document {
  id: number;
  recordId: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  currentVersion: number;
  bitrixFileId: number;
  bitrixFolderId: number;
  createdAt: string;
}

/**
 * Represents a single version of a document.
 */
export interface DocumentVersion {
  id: number;
  documentId: number;
  versionNumber: number;
  bitrixFileId: number;
  sha256Checksum: string;
  fileSize: number;
  uploadedByUserId: number;
  uploadedAt: string;
}

/**
 * Request payload for uploading a new document to a record.
 */
export interface UploadDocumentRequest {
  recordId: number;
  file: File;
}

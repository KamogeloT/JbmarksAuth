/**
 * Location types in the storage hierarchy.
 */
export type LocationType = 'Building' | 'Floor' | 'Room' | 'Shelf' | 'Position';

/**
 * Physical record status values.
 */
export type PhysicalRecordStatus = 'InStorage' | 'OnLoan' | 'InTransit' | 'Disposed';

/**
 * Represents a physical record with barcode/QR and location tracking.
 */
export interface PhysicalRecord {
  id: number;
  recordId: number;
  barcodeValue: string;
  qrCodeValue: string;
  currentLocationId: number | null;
  status: PhysicalRecordStatus;
  createdAt: string;
}

/**
 * Represents a location in the storage hierarchy.
 */
export interface StorageLocation {
  id: number;
  parentId: number | null;
  locationType: LocationType;
  locationName: string;
  locationCode: string;
  isActive: boolean;
  children?: StorageLocation[];
}

/**
 * Represents a loan of a physical record to a user.
 */
export interface Loan {
  id: number;
  physicalRecordId: number;
  borrowerUserId: number;
  loanDate: string;
  expectedReturnDate: string;
  actualReturnDate: string | null;
  status: 'Active' | 'Returned' | 'Overdue';
  createdByUserId: number;
  createdAt: string;
}

/**
 * Represents a movement of a physical record between locations.
 */
export interface Movement {
  id: number;
  physicalRecordId: number;
  fromLocationId: number | null;
  toLocationId: number;
  movedByUserId: number;
  movedAt: string;
}

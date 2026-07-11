// Local Storage Service for offline support and report history

import { FaultReport } from '../types';

const STORAGE_KEY = 'fault_reports';
const DRAFTS_KEY = 'fault_report_drafts';

class StorageService {
  /**
   * Save a report to local storage
   */
  saveReport(report: FaultReport): void {
    try {
      const reports = this.getAllReports();
      
      // Check if report already exists
      const existingIndex = reports.findIndex(r => r.id === report.id);
      
      if (existingIndex >= 0) {
        reports[existingIndex] = report;
      } else {
        reports.push(report);
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
      console.log('Report saved to local storage:', report.id);
    } catch (error) {
      console.error('Error saving report to storage:', error);
    }
  }

  /**
   * Get all reports from local storage
   */
  getAllReports(): FaultReport[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      
      const reports = JSON.parse(data) as FaultReport[];
      // Sort by created date, newest first
      return reports.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('Error reading reports from storage:', error);
      return [];
    }
  }

  /**
   * Get a single report by ID
   */
  getReport(id: string): FaultReport | null {
    const reports = this.getAllReports();
    return reports.find(r => r.id === id) || null;
  }

  /**
   * Get a report by reference number
   */
  getReportByRefNumber(refNumber: string): FaultReport | null {
    const reports = this.getAllReports();
    return reports.find(r => r.refNumber === refNumber) || null;
  }

  /**
   * Delete a report from storage
   */
  deleteReport(id: string): void {
    try {
      const reports = this.getAllReports();
      const filtered = reports.filter(r => r.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      console.log('Report deleted from storage:', id);
    } catch (error) {
      console.error('Error deleting report:', error);
    }
  }

  /**
   * Get pending reports (failed submissions)
   */
  getPendingReports(): FaultReport[] {
    return this.getAllReports().filter(r => r.status === 'pending' || r.status === 'failed');
  }

  /**
   * Save a draft report
   */
  saveDraft(draft: Partial<FaultReport>): void {
    try {
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(draft));
      console.log('Draft saved');
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }

  /**
   * Get the current draft
   */
  getDraft(): Partial<FaultReport> | null {
    try {
      const data = localStorage.getItem(DRAFTS_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error reading draft:', error);
      return null;
    }
  }

  /**
   * Clear the current draft
   */
  clearDraft(): void {
    try {
      localStorage.removeItem(DRAFTS_KEY);
      console.log('Draft cleared');
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  }

  /**
   * Clear all reports from storage
   */
  clearAllReports(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('All reports cleared');
    } catch (error) {
      console.error('Error clearing reports:', error);
    }
  }

  /**
   * Generate a unique ID for a report
   */
  generateId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a reference number
   */
  generateRefNumber(): string {
    return `REF${Date.now()}`;
  }

  /**
   * Check if storage is available
   */
  isStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get storage usage info
   */
  getStorageInfo(): { count: number; size: string } {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const reports = data ? JSON.parse(data) : [];
      const size = new Blob([data || '']).size;
      const sizeKB = (size / 1024).toFixed(2);
      
      return {
        count: reports.length,
        size: `${sizeKB} KB`
      };
    } catch {
      return { count: 0, size: '0 KB' };
    }
  }
}

export const storageService = new StorageService();
export default StorageService;


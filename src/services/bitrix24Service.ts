// Bitrix24 API Integration Service (Fixed Version)
// This service handles creating tasks in Bitrix24 when faults are reported

import { config } from '../config';
import { FaultReport, Bitrix24Task, SubmitResult } from '../types';

class Bitrix24Service {
  /**
   * Sanitize webhook URL to remove trailing slash
   */
  private getSanitizedWebhookUrl(): string {
    const url = config.bitrix24.webhookUrl;
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }

  /**
   * Create a task in Bitrix24 from a fault report
   * If file is provided, uploads it FIRST then creates task with file attached
   */
  async createTaskFromFault(faultReport: FaultReport, file?: File): Promise<SubmitResult> {
    try {
      const groupId = this.getGroupId(faultReport.formType);
      
      console.log(`Creating task for ${faultReport.formType} fault, Group ID: ${groupId}`);
      
      // Step 1: Upload file FIRST if provided (following official Bitrix24 docs)
      let fileId: number | undefined;
      
      if (file) {
        console.log('📤 Step 1: Uploading file BEFORE task creation...');
        const uploadResult = await this.uploadFileToUploadFolder(file);
        
        if (!uploadResult.success) {
          console.error('❌ File upload failed:', uploadResult.error);
          return {
            success: false,
            error: `File upload failed: ${uploadResult.error}`
          };
        }
        
        fileId = uploadResult.fileId;
        console.log('✅ File uploaded successfully, ID:', fileId);
      }
      
      // Step 2: Create task with file attached (if fileId exists)
      console.log('📝 Step 2: Creating task' + (fileId ? ' with attached file...' : '...'));
      
      const task: Bitrix24Task = {
        TITLE: this.generateTaskTitle(faultReport),
        DESCRIPTION: this.generateTaskDescription(faultReport),
        RESPONSIBLE_ID: config.bitrix24.defaultUserId,
        CREATED_BY: config.bitrix24.defaultUserId,
        GROUP_ID: groupId,
        STAGE_ID: 'NEW',
        PRIORITY: this.getPriority(faultReport.formType),
        DEADLINE: this.getDeadline(faultReport.formType),
        UF_CRM_TASK: faultReport.refNumber
      };

      // Add file to task if uploaded (official Bitrix24 way)
      if (fileId) {
        (task as any).UF_TASK_WEBDAV_FILES = [fileId];
      }

      console.log('Task payload:', JSON.stringify(task, null, 2));

      const webhookUrl = this.getSanitizedWebhookUrl();
      const response = await fetch(`${webhookUrl}/tasks.task.add.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: task
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP error ${response.status}:`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('Bitrix24 response:', result);

      if (result.error) {
        console.error('❌ Bitrix24 error:', result.error);
        return {
          success: false,
          error: result.error.error_description || result.error.error || 'Failed to create task'
        };
      }

      if (result.result?.task?.id) {
        console.log('✅ Task created successfully, ID:', result.result.task.id);
        return {
          success: true,
          taskId: String(result.result.task.id)
        };
      } else {
        console.error('❌ Unexpected response format:', result);
        return {
          success: false,
          error: 'Unexpected response format from Bitrix24'
        };
      }
    } catch (error) {
      console.error('❌ Bitrix24 API Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      };
    }
  }

  /**
   * Upload file to Bitrix24 "upload" folder
   * Following official Bitrix24 documentation approach
   * Returns file ID that can be used in ATTACHEDFILES or UF_TASK_WEBDAV_FILES
   */
  private async uploadFileToUploadFolder(file: File): Promise<{ success: boolean; fileId?: number; error?: string }> {
    try {
      console.log('📤 Uploading file to Bitrix24 upload folder...');
      console.log('📄 File:', file.name, file.size, 'bytes', file.type);
      
      // Validate file
      if (!file || file.size === 0) {
        return {
          success: false,
          error: 'File is empty or invalid'
        };
      }
      
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return {
          success: false,
          error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max 10MB)`
        };
      }
      
      // Convert file to base64
      const base64Content = await this.fileToBase64(file);
      console.log('✅ File converted to base64, length:', base64Content.length);
      
      // Upload using disk.folder.uploadfile with id=upload (official method)
      const webhookUrl = this.getSanitizedWebhookUrl();
      const uploadUrl = `${webhookUrl}/disk.folder.uploadfile.json`;
      
      // Bitrix24 expects fileContent as an array element
      const params = new URLSearchParams();
      params.append('id', 'upload'); // Use default upload folder
      params.append('data[NAME]', file.name);
      params.append('fileContent[0]', base64Content); // Array format for base64
      
      console.log('🚀 Uploading to:', uploadUrl);
      console.log('📦 Folder: upload (default)');
      console.log('📄 Filename:', file.name);
      console.log('📊 Base64 length:', base64Content.length, 'characters');
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });
      
      console.log('📊 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Upload failed - HTTP ${response.status}:`, errorText);
        
        // Try to parse error as JSON for better error message
        try {
          const errorJson = JSON.parse(errorText);
          const errorMsg = errorJson.error?.error_description || errorJson.error_description || errorText;
          return {
            success: false,
            error: `Upload failed (${response.status}): ${errorMsg}`
          };
        } catch {
          return {
            success: false,
            error: `Upload failed: HTTP ${response.status} - ${errorText.substring(0, 100)}`
          };
        }
      }
      
      const result = await response.json();
      console.log('📥 Upload result:', JSON.stringify(result, null, 2));
      
      if (result.error) {
        console.error('❌ Bitrix24 error:', result.error);
        const errorMsg = result.error.error_description || result.error.error || JSON.stringify(result.error);
        return {
          success: false,
          error: `Bitrix24 error: ${errorMsg}`
        };
      }
      
      if (result.result?.ID) {
        const fileId = parseInt(result.result.ID, 10);
        console.log('✅ File uploaded successfully! File ID:', fileId);
        return {
          success: true,
          fileId: fileId
        };
      } else {
        console.error('❌ Unexpected response format:', result);
        return {
          success: false,
          error: 'Unexpected response format from Bitrix24'
        };
      }
      
    } catch (error) {
      console.error('❌ Upload exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Get workgroup storage ID from group ID
   * Each workgroup has a storage in Bitrix24 Drive
   * @deprecated - No longer needed with new upload approach
   */
  async getWorkgroupStorageId(groupId: string): Promise<{ success: boolean; storageId?: string; error?: string }> {
    try {
      const webhookUrl = this.getSanitizedWebhookUrl();
      
      // Get list of all storages and find the one for this workgroup
      const response = await fetch(`${webhookUrl}/disk.storage.getlist.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter: {
            ENTITY_TYPE: 'group',
            ENTITY_ID: groupId
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to get storage list: ${response.status}`);
      }

      const result = await response.json();
      console.log('Storage list response:', result);

      if (result.error) {
        return {
          success: false,
          error: result.error.error_description || 'Failed to get workgroup storage'
        };
      }

      if (result.result && result.result.length > 0) {
        const storageId = result.result[0].ID;
        console.log(`Found storage ID ${storageId} for workgroup ${groupId}`);
        return {
          success: true,
          storageId: String(storageId)
        };
      }

      return {
        success: false,
        error: 'No storage found for workgroup'
      };
    } catch (error) {
      console.error('Error getting workgroup storage:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get workgroup storage'
      };
    }
  }

  /**
   * Get configured folder ID for a department (if any)
   */
  private getConfiguredFolderId(faultType: string): string | undefined {
    if (!config.bitrix24.driveFolders) return undefined;
    
    const folderMap: Record<string, string | undefined> = {
      'Water': config.bitrix24.driveFolders.water,
      'Electricity': config.bitrix24.driveFolders.electricity,
      'Roads': config.bitrix24.driveFolders.roads,
      'Waste': config.bitrix24.driveFolders.waste
    };

    return folderMap[faultType];
  }

  /**
   * Upload file to workgroup's Drive using the group ID
   * Supports both manual folder ID configuration and automatic storage lookup
   */
  /**
   * Convert File to base64 string
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      console.log('🔄 Converting file to base64:', file.name, file.size, 'bytes');
      
      // Check if file has pre-stored base64 data (from Capacitor Camera)
      if ((file as any).__base64Data) {
        console.log('✅ Using pre-stored base64 (no re-conversion needed)');
        resolve((file as any).__base64Data);
        return;
      }
      
      // Read file using FileReader
      console.log('📖 Reading file with FileReader...');
      const reader = new FileReader();
      
      reader.onload = () => {
        const result = reader.result as string;
        if (!result) {
          reject(new Error('FileReader returned empty result'));
          return;
        }
        
        // Extract base64 (remove data:image/xxx;base64, prefix)
        const base64 = result.split(',')[1];
        if (!base64) {
          reject(new Error('Could not extract base64 data'));
          return;
        }
        
        console.log('✅ Conversion complete, length:', base64.length);
        resolve(base64);
      };
      
      reader.onerror = () => {
        console.error('❌ FileReader error');
        reject(new Error('FileReader failed'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  async uploadFileToDrive(file: File, faultType: string): Promise<{ success: boolean; fileId?: string; error?: string }> {
    try {
      console.log(`Uploading file: ${file.name} for fault type: ${faultType}`);
      console.log('📄 File size:', file.size, 'bytes');
      console.log('📄 File type:', file.type);
      
      // Validate file
      if (!file || file.size === 0) {
        console.error('❌ Invalid file: File is empty or undefined');
        return {
          success: false,
          error: 'File is empty or invalid'
        };
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        console.error('❌ File too large:', file.size, 'bytes');
        return {
          success: false,
          error: `File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 10MB.`
        };
      }
      
      if (!file.type || !file.type.startsWith('image/')) {
        console.warn('⚠️ Warning: File type is not image:', file.type);
      }
      
      const webhookUrl = this.getSanitizedWebhookUrl();
      const configuredFolderId = this.getConfiguredFolderId(faultType);

      // Convert file to base64 for REST API compatibility
      const base64Content = await this.fileToBase64(file);
      console.log('✓ File converted to base64, length:', base64Content.length);

      // Method 1: If a specific folder ID is configured, use disk.folder.uploadfile
      if (configuredFolderId) {
        console.log(`📁 METHOD 1: Using configured folder ID: ${configuredFolderId} for ${faultType}`);
        
        // Use URLSearchParams for proper URL-encoded format
        const params = new URLSearchParams();
        params.append('id', configuredFolderId);
        params.append('fileContent[name]', file.name);
        params.append('fileContent[content]', base64Content);
        
        const uploadUrl = `${webhookUrl}/disk.folder.uploadfile.json`;
        
        console.log('🔗 Upload URL:', uploadUrl);
        console.log('📂 Target folder ID:', configuredFolderId);
        console.log('📄 File name:', file.name);

        let uploadResponse;
        try {
          console.log('🚀 Starting fetch request...');
          uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString()
          });
          console.log('✅ Fetch completed successfully');
        } catch (fetchError) {
          console.error('❌ FETCH FAILED - Network or CORS error');
          console.error('Fetch error type:', fetchError instanceof Error ? fetchError.constructor.name : typeof fetchError);
          console.error('Fetch error message:', fetchError instanceof Error ? fetchError.message : String(fetchError));
          console.error('Full fetch error:', JSON.stringify(fetchError, Object.getOwnPropertyNames(fetchError)));
          console.log('⏭️ Trying METHOD 2 (automatic storage lookup)...');
          // Continue to METHOD 2
          uploadResponse = null;
        }

        if (uploadResponse) {
          console.log('📊 Response status:', uploadResponse.status, uploadResponse.statusText);

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error(`❌ METHOD 1 FAILED - HTTP ${uploadResponse.status}:`, errorText);
            console.log('⏭️ Trying METHOD 2 (automatic storage lookup)...');
          } else {
            const uploadResult = await uploadResponse.json();
            console.log('📥 Upload result:', JSON.stringify(uploadResult, null, 2));

            if (uploadResult.error) {
              console.error('❌ METHOD 1 FAILED - Bitrix24 error:', uploadResult.error);
              console.error('Error code:', uploadResult.error.error || 'N/A');
              console.error('Error description:', uploadResult.error.error_description || 'N/A');
              console.log('⏭️ Trying METHOD 2 (automatic storage lookup)...');
            } else if (uploadResult.result?.ID) {
              console.log('✅ METHOD 1 SUCCESS! File ID:', uploadResult.result.ID);
              return {
                success: true,
                fileId: String(uploadResult.result.ID)
              };
            } else {
              console.warn('⚠️ METHOD 1: No file ID in response, trying METHOD 2...');
            }
          }
        }
      }

      // Method 2: Automatic - Get workgroup's storage and upload there
      console.log(`📂 METHOD 2: Using automatic storage lookup for ${faultType}`);
      const groupId = this.getGroupId(faultType);
      console.log('🔍 Looking up storage for workgroup ID:', groupId);
      
      const storageResult = await this.getWorkgroupStorageId(groupId);
      
      if (!storageResult.success || !storageResult.storageId) {
        console.error('❌ METHOD 2 FAILED: Could not get workgroup storage');
        console.error('Storage error:', storageResult.error);
        return {
          success: false,
          error: `METHOD 1 & 2 FAILED. Storage lookup error: ${storageResult.error || 'Could not access workgroup Drive'}`
        };
      }

      console.log('✓ Storage found:', storageResult.storageId);

      // Upload file to workgroup's Drive storage using base64 format
      // Use URLSearchParams for proper URL-encoded format
      const params = new URLSearchParams();
      params.append('id', storageResult.storageId);
      params.append('data[NAME]', file.name);  // Use array notation, not JSON.stringify
      params.append('fileContent[name]', file.name);
      params.append('fileContent[content]', base64Content);
      
      const uploadUrl = `${webhookUrl}/disk.storage.uploadfile.json`;
      
      console.log('🔗 Upload URL:', uploadUrl);
      console.log('📦 Uploading to storage ID:', storageResult.storageId);
      console.log('📄 File name:', file.name);

      let uploadResponse;
      try {
        console.log('🚀 Starting fetch request (METHOD 2)...');
        uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString()
        });
        console.log('✅ Fetch completed successfully');
      } catch (fetchError) {
        console.error('❌ FETCH FAILED (METHOD 2) - Network or CORS error');
        console.error('Fetch error type:', fetchError instanceof Error ? fetchError.constructor.name : typeof fetchError);
        console.error('Fetch error message:', fetchError instanceof Error ? fetchError.message : String(fetchError));
        console.error('Full fetch error:', JSON.stringify(fetchError, Object.getOwnPropertyNames(fetchError)));
        console.error('This is likely a network connectivity issue or CORS problem');
        
        return {
          success: false,
          error: `BOTH METHODS FAILED. Network error: ${fetchError instanceof Error ? fetchError.message : 'Failed to fetch'}`
        };
      }

      console.log('📊 Response status:', uploadResponse.status, uploadResponse.statusText);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error(`❌ METHOD 2 FAILED - HTTP ${uploadResponse.status}:`, errorText);
        return {
          success: false,
          error: `BOTH METHODS FAILED. HTTP ${uploadResponse.status}: ${errorText}`
        };
      }

      const uploadResult = await uploadResponse.json();
      console.log('📥 Upload result:', JSON.stringify(uploadResult, null, 2));

      if (uploadResult.error) {
        console.error('❌ METHOD 2 FAILED - Bitrix24 error:', uploadResult.error);
        return {
          success: false,
          error: `BOTH METHODS FAILED. Bitrix error: ${uploadResult.error.error_description || uploadResult.error.error || 'Unknown error'}`
        };
      }

      if (uploadResult.result?.ID) {
        console.log('✅ METHOD 2 SUCCESS! File ID:', uploadResult.result.ID);
        return {
          success: true,
          fileId: String(uploadResult.result.ID)
        };
      }

      console.error('❌ No file ID returned from upload');
      return {
        success: false,
        error: 'BOTH METHODS FAILED. No file ID returned from Drive upload'
      };
    } catch (error) {
      console.error('Drive upload error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      let errorMessage = 'File upload to Drive failed';
      if (error instanceof Error) {
        errorMessage = `${error.name}: ${error.message}`;
        console.error('Error stack:', error.stack);
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * @deprecated - No longer used. Files are now uploaded BEFORE task creation
   * and attached using UF_TASK_WEBDAV_FILES field in tasks.task.add
   * 
   * New approach (following official Bitrix24 docs):
   * 1. Upload file to "upload" folder using disk.folder.uploadfile
   * 2. Get file ID from response
   * 3. Create task with UF_TASK_WEBDAV_FILES: [fileId]
   * 
   * This is simpler, more reliable, and follows official documentation.
   */

  /**
   * Generate task title based on fault type
   */
  private generateTaskTitle(faultReport: FaultReport): string {
    const typeMap: Record<string, string> = {
      'Water': 'Water & Sanitation Issue',
      'Electricity': 'Electricity Issue',
      'Roads': 'Roads & Stormwater Issue',
      'Waste': 'Refuse & Waste Issue'
    };

    const baseTitle = typeMap[faultReport.formType] || 'Municipal Issue';
    return `${baseTitle} - ${faultReport.specificField || 'General Issue'}`;
  }

  /**
   * Generate detailed task description
   */
  private generateTaskDescription(faultReport: FaultReport): string {
    return `
FAULT REPORT DETAILS:
====================

Reference Number: ${faultReport.refNumber}
Reported By: ${faultReport.fullName}
Contact: ${faultReport.contactNumber}
Email: ${faultReport.email || 'Not provided'}
Location: ${faultReport.address}

Issue Type: ${faultReport.formType}
Specific Issue: ${faultReport.specificField}

Description:
${faultReport.details}

Additional Notes:
- Photo attached: ${faultReport.photoFile ? 'Yes' : 'No'}
- Reported via: Municipal Fault Reporting Mobile App
- Timestamp: ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}

Please investigate and resolve this issue promptly.
    `.trim();
  }

  /**
   * Get group ID based on fault type (Fixed to use config)
   */
  private getGroupId(faultType: string): string {
    const groupMap: Record<string, string> = {
      'Water': config.bitrix24.groups.water,
      'Electricity': config.bitrix24.groups.electricity,
      'Roads': config.bitrix24.groups.roads,
      'Waste': config.bitrix24.groups.waste
    };

    const groupId = groupMap[faultType] || config.bitrix24.groups.water;
    console.log(`Routing ${faultType} fault to group ID: ${groupId}`);
    return groupId;
  }

  /**
   * Get priority based on fault type
   */
  private getPriority(faultType: string): string {
    const priorityMap: Record<string, string> = {
      'Water': '2', // High priority
      'Electricity': '2', // High priority
      'Roads': '1', // Medium priority
      'Waste': '1' // Medium priority
    };

    return priorityMap[faultType] || '1';
  }

  /**
   * Get deadline based on fault type
   */
  private getDeadline(faultType: string): string {
    const now = new Date();
    
    switch (faultType) {
      case 'Water':
      case 'Electricity':
        // Critical issues: 24 hours
        now.setHours(now.getHours() + 24);
        break;
      case 'Roads':
        // Road issues: 72 hours
        now.setHours(now.getHours() + 72);
        break;
      case 'Waste':
        // Waste issues: 48 hours
        now.setHours(now.getHours() + 48);
        break;
      default:
        now.setHours(now.getHours() + 48);
    }

    return now.toISOString();
  }
}

export const bitrix24Service = new Bitrix24Service();
export default Bitrix24Service;


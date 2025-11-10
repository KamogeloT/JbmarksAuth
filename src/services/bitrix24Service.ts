// Bitrix24 API Integration Service (Fixed Version)
// This service handles creating tasks in Bitrix24 when faults are reported

import { config } from '../config';
import { FaultReport, Bitrix24Task, SubmitResult, FileUploadResult } from '../types';

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
   */
  async createTaskFromFault(faultReport: FaultReport): Promise<SubmitResult> {
    try {
      const groupId = this.getGroupId(faultReport.formType);
      
      console.log(`Creating task for ${faultReport.formType} fault, Group ID: ${groupId}`);
      
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

      console.log('Sending task to Bitrix24:', JSON.stringify(task, null, 2));

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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Bitrix24 response:', result);

      if (result.result?.task?.id) {
        return {
          success: true,
          taskId: String(result.result.task.id)
        };
      } else {
        console.error('Bitrix24 error details:', result.error);
        return {
          success: false,
          error: result.error?.error_description || result.error_description || 'Failed to create task'
        };
      }
    } catch (error) {
      console.error('Bitrix24 API Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      };
    }
  }

  /**
   * Get workgroup storage ID from group ID
   * Each workgroup has a storage in Bitrix24 Drive
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
      console.log('🔄 Converting file to base64:', {
        name: file.name,
        size: file.size,
        type: file.type,
        isCamera: !!(file as any).__isCamera
      });
      
      // Check if this file has pre-stored base64 data (from camera)
      if ((file as any).__base64Data) {
        console.log('✅ Using pre-stored base64 data from camera (avoiding double conversion)');
        const base64 = (file as any).__base64Data;
        console.log('✅ Base64 data length:', base64.length);
        resolve(base64);
        return;
      }
      
      // For gallery images, read the file normally
      console.log('📖 Reading file from gallery using FileReader');
      const reader = new FileReader();
      
      reader.onload = () => {
        try {
          const result = reader.result as string;
          
          if (!result) {
            throw new Error('FileReader returned empty result');
          }
          
          // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
          const parts = result.split(',');
          if (parts.length < 2) {
            console.error('❌ Invalid data URL format:', result.substring(0, 100));
            throw new Error('Invalid data URL format');
          }
          
          const base64 = parts[1];
          console.log('✅ Base64 conversion successful (gallery), length:', base64.length);
          resolve(base64);
        } catch (error) {
          console.error('❌ Error in FileReader onload:', error);
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        console.error('❌ FileReader error:', error);
        reject(new Error(`FileReader failed: ${error}`));
      };
      
      reader.onabort = () => {
        console.error('❌ FileReader aborted');
        reject(new Error('FileReader was aborted'));
      };
      
      try {
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('❌ Error starting FileReader:', error);
        reject(error);
      }
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
   * Upload file to Bitrix24 and attach to task
   * This version properly uploads to workgroup Drive first, then attaches to task
   */
  async uploadFile(file: File, taskId: string, faultType: string): Promise<FileUploadResult> {
    try {
      console.log(`Processing file upload for task: ${taskId}`);
      
      // Step 1: Upload file to workgroup's Drive folder
      const driveUpload = await this.uploadFileToDrive(file, faultType);
      
      if (!driveUpload.success || !driveUpload.fileId) {
        return {
          success: false,
          error: driveUpload.error || 'Failed to upload file to Drive'
        };
      }

      // Step 2: Attach the file to the task using tasks.task.files.attach
      const webhookUrl = this.getSanitizedWebhookUrl();
      const attachUrl = `${webhookUrl}/tasks.task.files.attach.json`;
      
      console.log('📎 STEP 2: Attaching file to task...');
      console.log('🎯 Task ID:', taskId);
      console.log('📄 File ID:', driveUpload.fileId);
      console.log('🔗 Attach URL:', attachUrl);

      const attachPayload = {
        taskId: taskId,
        fileId: driveUpload.fileId
      };
      console.log('📦 Attach payload:', JSON.stringify(attachPayload, null, 2));

      const attachResponse = await fetch(attachUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attachPayload)
      });

      console.log('📊 Attach response status:', attachResponse.status, attachResponse.statusText);

      if (!attachResponse.ok) {
        const errorText = await attachResponse.text();
        console.error(`❌ File attach failed - HTTP ${attachResponse.status}:`, errorText);
        
        // File is uploaded to Drive, but attachment failed
        return {
          success: true,
          fileId: driveUpload.fileId,
          error: `File uploaded to Drive (ID: ${driveUpload.fileId}) but failed to attach to task. HTTP ${attachResponse.status}: ${errorText}`
        };
      }

      const attachResult = await attachResponse.json();
      console.log('📥 Attach result:', JSON.stringify(attachResult, null, 2));

      if (attachResult.error) {
        console.error('❌ Bitrix24 attach error:', attachResult.error);
        // File is uploaded to Drive, but attachment failed
        return {
          success: true,
          fileId: driveUpload.fileId,
          error: `File uploaded to Drive (ID: ${driveUpload.fileId}) but Bitrix error during attachment: ${attachResult.error.error_description || attachResult.error.error || 'Unknown error'}`
        };
      }

      console.log('✅✅ SUCCESS! File uploaded to Drive AND attached to task!');
      return {
        success: true,
        fileId: driveUpload.fileId
      };
    } catch (error) {
      console.error('File upload/attach error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'File upload failed'
      };
    }
  }

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


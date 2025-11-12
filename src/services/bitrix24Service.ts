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
   * If file is provided, creates task FIRST, then attaches file via comment
   * This is the most reliable method for Bitrix24 REST API
   */
  async createTaskFromFault(faultReport: FaultReport, file?: File): Promise<SubmitResult> {
    try {
      const groupId = this.getGroupId(faultReport.formType);
      
      console.log(`Creating task for ${faultReport.formType} fault, Group ID: ${groupId}`);
      
      // Step 1: Create task first (without file)
      console.log('📝 Step 1: Creating task...');
      
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
      console.log('Bitrix24 task creation response:', result);

      if (result.error) {
        console.error('❌ Bitrix24 error:', result.error);
        return {
          success: false,
          error: result.error.error_description || result.error.error || 'Failed to create task'
        };
      }

      if (!result.result?.task?.id) {
        console.error('❌ Unexpected response format:', result);
        return {
          success: false,
          error: 'Unexpected response format from Bitrix24'
        };
      }

      const taskId = String(result.result.task.id);
      console.log('✅ Task created successfully, ID:', taskId);

      // Step 2: If file provided, attach it via comment
      if (file) {
        console.log('📤 Step 2: Attaching file to task via comment...');
        const attachResult = await this.attachFileToTask(taskId, file);
        
        if (!attachResult.success) {
          console.warn('⚠️ File attachment failed:', attachResult.error);
          console.warn('Task created but without image');
          // Don't fail the whole operation - task is still created
        } else {
          console.log('✅ File attached successfully to task');
        }
      }

      return {
        success: true,
        taskId: taskId
      };
    } catch (error) {
      console.error('❌ Bitrix24 API Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      };
    }
  }

  /**
   * Attach file to an existing task via comment
   * This is the most reliable way to attach files in Bitrix24
   */
  private async attachFileToTask(taskId: string, file: File): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📎 Attaching file to task', taskId);
      console.log('📄 File details:', { name: file.name, size: file.size, type: file.type });
      
      // Validate file size
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        const errorMsg = `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max 10MB)`;
        console.error('❌', errorMsg);
        return {
          success: false,
          error: errorMsg
        };
      }
      
      // Convert file to base64
      const base64Content = await this.fileToBase64(file);
      console.log('✅ File converted to base64, length:', base64Content.length);
      
      const webhookUrl = this.getSanitizedWebhookUrl();
      
      // Try Method 1: Upload to task's group storage then attach (preferred)
      console.log('🚀 Method 1: Trying task group storage upload...');
      
      // Get task details to find group
      const taskResponse = await fetch(`${webhookUrl}/tasks.task.get.json?taskId=${taskId}`, {
        method: 'GET'
      });
      
      const taskResult = await taskResponse.json();
      const groupId = taskResult.result?.task?.groupId;
      
      if (groupId) {
        console.log('👥 Task group ID:', groupId);
        
        // Get group's storage
        const storageResponse = await fetch(`${webhookUrl}/disk.storage.getlist.json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filter: {
              ENTITY_TYPE: 'group',
              ENTITY_ID: groupId
            }
          })
        });
        
        const storageResult = await storageResponse.json();
        console.log('📦 Group storage:', storageResult);
        
        if (storageResult.result && storageResult.result.length > 0) {
          const storageId = storageResult.result[0].ID;
          const folderId = storageResult.result[0].ROOT_OBJECT_ID;
          console.log('📁 Storage ID:', storageId, 'Folder ID:', folderId);
          
          // Upload file to group's folder (not storage!)
          const timestamp = Date.now();
          const uniqueFileName = `${timestamp}_${file.name}`;
          
          const uploadParams = new URLSearchParams();
          uploadParams.append('id', folderId);  // Use ROOT_OBJECT_ID!
          uploadParams.append('data[NAME]', uniqueFileName);  // Unique filename
          uploadParams.append('fileContent', base64Content);
          uploadParams.append('generateUniqueName', '1');  // Auto-rename if exists
          
          const uploadResponse1 = await fetch(`${webhookUrl}/disk.folder.uploadfile.json`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: uploadParams.toString()
          });
          
          console.log('📊 Method 1 upload status:', uploadResponse1.status);
          
          if (uploadResponse1.ok) {
            const uploadResult1 = await uploadResponse1.json();
            console.log('📥 Method 1 upload result:', uploadResult1);
            
            if (!uploadResult1.error && uploadResult1.result?.ID) {
              const diskId = uploadResult1.result.ID;
              console.log('✅ File uploaded to group storage, Disk ID:', diskId);
              
              // Attach file to task using tasks.task.files.attach with DISK_ID
              console.log('📎 Attaching file to task using tasks.task.files.attach...');
              const attachParams = new URLSearchParams();
              attachParams.append('taskId', taskId);
              attachParams.append('fileId', diskId);  // Use DISK_ID (not FILE_ID!)
              
              const attachResponse = await fetch(`${webhookUrl}/tasks.task.files.attach.json`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: attachParams.toString()
              });
              
              if (attachResponse.ok) {
                const attachResult = await attachResponse.json();
                console.log('📥 Attach result:', attachResult);
                
                if (!attachResult.error && attachResult.result) {
                  console.log('✅ File attached successfully! Attachment ID:', attachResult.result.attachmentId);
                  return { success: true };
                } else {
                  console.warn('⚠️ Attach returned error:', attachResult.error);
                }
              }
            }
            
            console.warn('⚠️ Method 1 failed, trying alternative...');
          } else {
            const errorText1 = await uploadResponse1.text();
            console.warn(`⚠️ Method 1 HTTP error ${uploadResponse1.status}:`, errorText1);
            console.log('Trying alternative method...');
          }
        } else {
          console.warn('⚠️ No group storage found for Method 1');
        }
      } else {
        console.warn('⚠️ Task has no group ID');
      }
      
      // Try Method 2: Simple fallback (just in case)
      console.log('🚀 Method 2: Fallback method...');
      console.warn('❌ No working upload method available');
      
      // Both methods failed
      console.error('❌ All attachment methods failed');
      return {
        success: false,
        error: 'Could not attach file using available methods. Check webhook permissions.'
      };
      
    } catch (error) {
      console.error('❌ File attachment exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to attach file'
      };
    }
  }

  // Note: Old uploadFileToUploadFolder method removed - now using task.commentitem.add for file attachment

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


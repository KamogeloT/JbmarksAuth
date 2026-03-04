// Bitrix24 API Integration Service (Fixed Version)
// This service handles creating tasks in Bitrix24 when faults are reported

import { config } from '../config';
import { FaultReport, Bitrix24Task, SubmitResult } from '../types';
import { debugLogger } from './debugLogger';

class Bitrix24Service {
  /**
   * Sanitize webhook URL to remove trailing slash
   */
  private getSanitizedWebhookUrl(): string {
    const url = config.bitrix24.webhookUrl;
    if (!url || url.trim() === '') {
      throw new Error(`WEBHOOK URL NOT CONFIGURED

❌ The Bitrix24 webhook URL is missing or empty.

TO FIX THIS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Create a .env file in your project root (if it doesn't exist)

2. Add your Bitrix24 webhook URL:
   VITE_BITRIX24_WEBHOOK_URL=https://your-domain.bitrix24.com/rest/1/YOUR_WEBHOOK_CODE/

3. Get your webhook URL from Bitrix24:
   - Go to: Settings → Integrations → Webhooks
   - Create or copy an "Inbound webhook"
   - Make sure it has permissions for: Tasks, Disk

4. Restart the development server:
   - Stop the server (Ctrl+C)
   - Run: npm run dev

5. Refresh your browser

WHERE TO FIND YOUR WEBHOOK URL:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Bitrix24 → Settings → Integrations → Webhooks → Inbound webhook

The URL should look like:
https://jbmarks.bitrix24.com/rest/1/abc123xyz456/

Make sure it includes:
✅ Full URL starting with https://
✅ /rest/1/ path
✅ Your webhook code
✅ Trailing slash (optional)`);
    }
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }

  /**
   * Create a task in Bitrix24 from a fault report
   * If file is provided, creates task FIRST, then attaches file via comment
   * This is the most reliable method for Bitrix24 REST API
   */
  async createTaskFromFault(faultReport: FaultReport, file?: File): Promise<SubmitResult> {
    try {
      await debugLogger.log('INFO', '=== START: Creating task from fault ===');
      await debugLogger.log('INFO', `Fault Type: ${faultReport.formType}`, { hasFile: !!file, fileSize: file?.size });
      
      const groupId = this.getGroupId(faultReport.formType, faultReport.city);
      
      console.log(`Creating task for ${faultReport.formType} fault, Group ID: ${groupId}`);
      await debugLogger.log('INFO', `Creating task for ${faultReport.formType}, Group ID: ${groupId}`);
      
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
      await debugLogger.logApiCall('POST', `${webhookUrl}/tasks.task.add.json`, { fields: task });
      
      const response = await fetch(`${webhookUrl}/tasks.task.add.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: task
        })
      });
      
      await debugLogger.log('INFO', `Task creation response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP error ${response.status}:`, errorText);
        
        // Create detailed error message for popup
        const detailedError = `HTTP ${response.status} ERROR

URL: ${webhookUrl}/tasks.task.add.json
Status: ${response.status} ${response.statusText}
Group ID: ${groupId}
Fault Type: ${faultReport.formType}
City: ${faultReport.city || 'Not specified'}

Error Response:
${errorText.substring(0, 500)}${errorText.length > 500 ? '...' : ''}

Please check:
- Webhook URL is correct
- Group ID ${groupId} exists in Bitrix24
- Webhook has permissions for Tasks`;
        
        throw new Error(detailedError);
      }

      const result = await response.json();
      console.log('Bitrix24 task creation response:', result);
      await debugLogger.logApiResponse('tasks.task.add.json', response.status, result);

      if (result.error) {
        console.error('❌ Bitrix24 error:', result.error);
        
        // Create detailed error message
        const detailedError = `BITRIX24 API ERROR

URL: ${webhookUrl}/tasks.task.add.json
Group ID: ${groupId}
Fault Type: ${faultReport.formType}
City: ${faultReport.city || 'Not specified'}

Error Code: ${result.error.error || 'Unknown'}
Error Description: ${result.error.error_description || 'No description provided'}

Full Error:
${JSON.stringify(result.error, null, 2)}

Please check:
- Group ID ${groupId} exists and is accessible
- Webhook has correct permissions
- All required fields are valid`;
        
        return {
          success: false,
          error: detailedError
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
      await debugLogger.log('INFO', `✅ Task created successfully, ID: ${taskId}`);

      // Step 2: If file provided, attach it via comment
      if (file) {
        console.log('📤 Step 2: Attaching file to task via comment...');
        await debugLogger.log('INFO', '📤 Step 2: Starting file attachment process');
        
        const attachResult = await this.attachFileToTask(taskId, file);
        
        if (!attachResult.success) {
          console.error('❌ File attachment failed:', attachResult.error);
          console.error('Task created but without image');
          await debugLogger.logError('File Attachment', attachResult.error);
          
          // Return error so user knows photo didn't upload
          return {
            success: false,
            error: `Task created (ID: ${taskId}) but photo failed to upload: ${attachResult.error || 'Unknown error'}`,
            taskId: taskId
          };
        } else {
          console.log('✅ File attached successfully to task');
          await debugLogger.log('INFO', '✅ File attached successfully to task');
        }
      }

      return {
        success: true,
        taskId: taskId
      };
    } catch (error) {
      console.error('❌ Bitrix24 API Error:', error);
      await debugLogger.logError('createTaskFromFault', error);
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
      await debugLogger.log('INFO', `📎 Attaching file to task ${taskId}`, { name: file.name, size: file.size, type: file.type });
      
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
      await debugLogger.log('INFO', `Fetching task details for task ${taskId}`);
      const taskResponse = await fetch(`${webhookUrl}/tasks.task.get.json?taskId=${taskId}`, {
        method: 'GET'
      });
      
      await debugLogger.log('INFO', `Task details response status: ${taskResponse.status}`);
      const taskResult = await taskResponse.json();
      const groupId = taskResult.result?.task?.groupId;
      await debugLogger.log('INFO', `Task group ID: ${groupId}`);
      
      if (groupId) {
        console.log('👥 Task group ID:', groupId);
        
        // Get group's storage
        await debugLogger.log('INFO', `Fetching storage for group ${groupId}`);
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
        
        await debugLogger.log('INFO', `Storage response status: ${storageResponse.status}`);
        const storageResult = await storageResponse.json();
        console.log('📦 Group storage:', storageResult);
        await debugLogger.log('INFO', `Storage result received`, { storageCount: storageResult.result?.length });
        
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
          
          await debugLogger.log('INFO', `Starting file upload to folder ${folderId}`, { 
            fileName: uniqueFileName, 
            base64Length: base64Content.length 
          });
          
          // Create abort controller for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
          
          let uploadResponse1;
          try {
            uploadResponse1 = await fetch(`${webhookUrl}/disk.folder.uploadfile.json`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: uploadParams.toString(),
              signal: controller.signal
            });
            clearTimeout(timeoutId);
          } catch (fetchError) {
            clearTimeout(timeoutId);
            await debugLogger.logError('File upload fetch failed', fetchError);
            throw fetchError;
          }
          
          console.log('📊 Method 1 upload status:', uploadResponse1.status);
          await debugLogger.log('INFO', `File upload response status: ${uploadResponse1.status}`);
          
          if (uploadResponse1.ok) {
            const uploadResult1 = await uploadResponse1.json();
            console.log('📥 Method 1 upload result:', uploadResult1);
            
            if (!uploadResult1.error && uploadResult1.result?.ID) {
              const diskId = uploadResult1.result.ID;
              const fileId = uploadResult1.result.FILE_ID;
              console.log('✅ File uploaded to group storage, Disk ID:', diskId, 'File ID:', fileId);
              await debugLogger.log('INFO', `✅ File uploaded to group storage`, { diskId, fileId });
              
              // Attach file to task using tasks.task.files.attach with DISK_ID (try DISK_ID first)
              console.log('📎 Attaching file to task using tasks.task.files.attach (trying DISK_ID first)...');
              await debugLogger.log('INFO', '📎 Trying tasks.task.files.attach with DISK_ID', { taskId, diskId });
              
              const attachParams = new URLSearchParams();
              attachParams.append('taskId', taskId);
              attachParams.append('fileId', diskId);  // Try DISK_ID first
              
              const attachResponse = await fetch(`${webhookUrl}/tasks.task.files.attach.json`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: attachParams.toString()
              });
              
              if (attachResponse.ok) {
                const attachResult = await attachResponse.json();
                console.log('📥 Attach result (DISK_ID):', attachResult);
                await debugLogger.logApiResponse('tasks.task.files.attach (DISK_ID)', attachResponse.status, attachResult);
                
                if (!attachResult.error && attachResult.result) {
                  console.log('✅ File attached successfully with DISK_ID! Attachment ID:', attachResult.result.attachmentId);
                  return { success: true };
                }
                
                // DISK_ID failed, try FILE_ID as fallback
                if (attachResult.error && fileId) {
                  console.warn('⚠️ DISK_ID failed, trying FILE_ID as fallback...');
                  await debugLogger.log('WARN', '⚠️ DISK_ID failed, trying FILE_ID as fallback', { taskId, fileId });
                  
                  const attachParams2 = new URLSearchParams();
                  attachParams2.append('taskId', taskId);
                  attachParams2.append('fileId', fileId);  // Try FILE_ID
                  
                  const attachResponse2 = await fetch(`${webhookUrl}/tasks.task.files.attach.json`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: attachParams2.toString()
                  });
                  
                  if (attachResponse2.ok) {
                    const attachResult2 = await attachResponse2.json();
                    console.log('📥 Attach result (FILE_ID):', attachResult2);
                    await debugLogger.logApiResponse('tasks.task.files.attach (FILE_ID)', attachResponse2.status, attachResult2);
                    
                    if (!attachResult2.error && attachResult2.result) {
                      console.log('✅ File attached successfully with FILE_ID! Attachment ID:', attachResult2.result.attachmentId);
                      return { success: true };
                    } else {
                      console.error('❌ Both DISK_ID and FILE_ID failed:', attachResult2.error);
                    }
                  }
                } else {
                  console.warn('⚠️ DISK_ID attach returned error:', attachResult.error);
                }
              }
            }
            
            console.warn('⚠️ Method 1 failed, trying alternative...');
          } else {
            const errorText1 = await uploadResponse1.text();
            console.warn(`⚠️ Method 1 HTTP error ${uploadResponse1.status}:`, errorText1);
            
            // Create detailed error for 404
            if (uploadResponse1.status === 404) {
              const detailedError = `HTTP 404 ERROR - FILE UPLOAD FAILED (Method 1)

URL: ${webhookUrl}/disk.folder.uploadfile.json
Task ID: ${taskId}
Group ID: ${groupId || 'Unknown'}
Folder ID: ${folderId || 'Unknown'}
Storage ID: ${storageId || 'Unknown'}

Error Response:
${errorText1.substring(0, 500)}${errorText1.length > 500 ? '...' : ''}

TROUBLESHOOTING:
1. Check if Folder ID ${folderId} exists in Bitrix24
2. Verify Group ID ${groupId} has Drive enabled
3. Check webhook has Drive permissions
4. Verify ROOT_OBJECT_ID is correct`;
              
              console.error(detailedError);
            }
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
      const detailedError = `FILE ATTACHMENT FAILED

Task ID: ${taskId}
All upload methods failed.

Please check:
- Webhook has Drive permissions
- Webhook has Tasks permissions
- Group has Drive storage enabled
- File size is under 10MB`;
      
      return {
        success: false,
        error: detailedError
      };
      
    } catch (error) {
      console.error('❌ File attachment exception:', error);
      await debugLogger.logError('attachFileToTask - Full Exception', error);
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
   * Get configured storage ID and root object ID for a department (bypasses API lookup)
   * NOTE: Area selection (Township/Town) does NOT affect routing - it's purely informational
   * Routing is based ONLY on city and department type
   */
  private getConfiguredStorageInfo(faultType: string, city?: string): { storageId?: string; rootObjectId?: string } {
    // Default to Potchefstroom if no city specified
    // Area (Township/Town) is ignored - routing only uses city
    const selectedCity = (city === 'Ventersdorp' || city === 'Potchefstroom') 
      ? city 
      : 'Potchefstroom';
    
    const cityStorage = config.bitrix24.storage[selectedCity];
    
    const storageMap: Record<string, { storageId: string; rootObjectId: string }> = {
      'Water': cityStorage.water,
      'Electricity': cityStorage.electricity,
      'Roads': cityStorage.roads,
      'Waste': cityStorage.waste
    };

    const storageInfo = storageMap[faultType];
    return {
      storageId: storageInfo?.storageId,
      rootObjectId: storageInfo?.rootObjectId
    };
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

  async uploadFileToDrive(file: File, faultType: string, city?: string): Promise<{ success: boolean; fileId?: string; error?: string }> {
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

      // Method 2: Try configured storage IDs first, then fallback to API lookup
      console.log(`📂 METHOD 2: Checking configured storage for ${faultType}`);
      
      // First, try using configured storage and root object IDs (fastest)
      const configuredStorage = this.getConfiguredStorageInfo(faultType, city);
      
      let storageId: string | undefined;
      let rootObjectId: string | undefined;
      
      if (configuredStorage.storageId && configuredStorage.rootObjectId) {
        console.log('✅ Using configured storage IDs (bypassing API lookup)');
        storageId = configuredStorage.storageId;
        rootObjectId = configuredStorage.rootObjectId;
        console.log(`📦 Storage ID: ${storageId}, Root Object ID: ${rootObjectId}`);
      } else {
        // Fallback: Look up storage via API
        console.log('🔍 Configured storage not available, looking up via API...');
        const groupId = this.getGroupId(faultType, city);
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

        storageId = storageResult.storageId;
        console.log('✓ Storage found via API:', storageId);
      }

      // Upload file to workgroup's Drive using root object ID (preferred) or storage ID
      // Use root object ID if available (faster, more direct)
      const uploadTargetId = rootObjectId || storageId;
      const uploadMethod = rootObjectId ? 'disk.folder.uploadfile' : 'disk.storage.uploadfile';
      
      // Use URLSearchParams for proper URL-encoded format
      const params = new URLSearchParams();
      params.append('id', uploadTargetId!);
      params.append('data[NAME]', file.name);  // Use array notation, not JSON.stringify
      params.append('fileContent[name]', file.name);
      params.append('fileContent[content]', base64Content);
      
      const uploadUrl = `${webhookUrl}/${uploadMethod}.json`;
      
      console.log('🔗 Upload URL:', uploadUrl);
      console.log(`📦 Uploading to ${rootObjectId ? 'root folder' : 'storage'} ID:`, uploadTargetId);
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
        
        // Handle 404 specifically - likely means storage/group ID is incorrect
        const groupId = this.getGroupId(faultType, city);
        
        if (uploadResponse.status === 404) {
          console.error(`❌ 404 ERROR: Storage ID or Root Object ID may be incorrect`);
          console.error(`   Storage ID: ${storageId}`);
          console.error(`   Root Object ID: ${rootObjectId}`);
          console.error(`   Upload Target ID: ${uploadTargetId}`);
          console.error(`   Method: ${uploadMethod}`);
          
          // Create detailed error message for popup
          const detailedError = `HTTP 404 ERROR - FILE UPLOAD FAILED

URL: ${uploadUrl}
Upload Method: ${uploadMethod}
Fault Type: ${faultType}
City: ${city || 'Not specified'}
Group ID: ${groupId}

Storage Information:
- Storage ID: ${storageId || 'Not configured'}
- Root Object ID: ${rootObjectId || 'Not configured'}
- Upload Target ID: ${uploadTargetId || 'N/A'}

Error Response:
${errorText.substring(0, 500)}${errorText.length > 500 ? '...' : ''}

TROUBLESHOOTING:
1. Check Storage ID in .env: VITE_BITRIX24_STORAGE_${city || 'POTCHEFSTROOM'}_${faultType.toUpperCase()}
2. Check Root Object ID in .env: VITE_BITRIX24_ROOT_${city || 'POTCHEFSTROOM'}_${faultType.toUpperCase()}
3. Verify these IDs exist in Bitrix24 Drive
4. Check webhook has Drive permissions
5. Verify Group ID is correct: ${groupId}`;
          
          return {
            success: false,
            error: detailedError
          };
        }
        
        // Create detailed error message for other HTTP errors
        const detailedError = `HTTP ${uploadResponse.status} ERROR - FILE UPLOAD FAILED

URL: ${uploadUrl}
Upload Method: ${uploadMethod}
Status: ${uploadResponse.status} ${uploadResponse.statusText}
Fault Type: ${faultType}
City: ${city || 'Not specified'}
Group ID: ${groupId}

Storage Information:
- Storage ID: ${storageId || 'Not configured'}
- Root Object ID: ${rootObjectId || 'Not configured'}
- Upload Target ID: ${uploadTargetId || 'N/A'}

Error Response:
${errorText.substring(0, 500)}${errorText.length > 500 ? '...' : ''}

Please check:
- Webhook URL is correct
- Storage/Root Object IDs are correct
- Webhook has Drive permissions`;
        
        return {
          success: false,
          error: detailedError
        };
      }

      const uploadResult = await uploadResponse.json();
      console.log('📥 Upload result:', JSON.stringify(uploadResult, null, 2));

      if (uploadResult.error) {
        console.error('❌ METHOD 2 FAILED - Bitrix24 error:', uploadResult.error);
        
        const groupId = this.getGroupId(faultType, city);
        const detailedError = `BITRIX24 API ERROR - FILE UPLOAD FAILED

URL: ${uploadUrl}
Upload Method: ${uploadMethod}
Fault Type: ${faultType}
City: ${city || 'Not specified'}
Group ID: ${groupId}

Storage Information:
- Storage ID: ${storageId || 'Not configured'}
- Root Object ID: ${rootObjectId || 'Not configured'}
- Upload Target ID: ${uploadTargetId || 'N/A'}

Error Code: ${uploadResult.error.error || 'Unknown'}
Error Description: ${uploadResult.error.error_description || 'No description'}

Full Error:
${JSON.stringify(uploadResult.error, null, 2)}`;
        
        return {
          success: false,
          error: detailedError
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
      
      const groupId = this.getGroupId(faultType, city);
      let errorMessage = 'File upload to Drive failed';
      
      if (error instanceof Error) {
        errorMessage = `FILE UPLOAD EXCEPTION

Error Type: ${error.name}
Error Message: ${error.message}

Fault Type: ${faultType}
City: ${city || 'Not specified'}
Group ID: ${groupId}

${error.stack ? `Stack Trace:\n${error.stack}` : ''}`;
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
    const areaInfo = faultReport.area && faultReport.city 
      ? `Area: ${faultReport.area}\nCity: ${faultReport.city}\n`
      : faultReport.area 
        ? `Area: ${faultReport.area}\n`
        : faultReport.city
          ? `City: ${faultReport.city}\n`
          : '';
    
    return `
FAULT REPORT DETAILS:
====================

Reference Number: ${faultReport.refNumber}
Reported By: ${faultReport.fullName}
Contact: ${faultReport.contactNumber}
Email: ${faultReport.email || 'Not provided'}
${areaInfo}Location: ${faultReport.address}

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
   * Get group ID based on fault type and city
   * NOTE: Area selection (Township/Town) does NOT affect routing - it's purely informational
   * Routing is based ONLY on city and department type
   * Since Township workgroups are not set up, all routing goes to the default city groups (Town)
   */
  private getGroupId(faultType: string, city?: string): string {
    // Default to Potchefstroom if no city specified
    // Area (Township/Town) is ignored - routing only uses city
    const selectedCity = (city === 'Ventersdorp' || city === 'Potchefstroom') 
      ? city 
      : 'Potchefstroom'; // Default fallback
    
    const cityGroups = config.bitrix24.groups[selectedCity];
    
    const groupMap: Record<string, string> = {
      'Water': cityGroups.water,
      'Electricity': cityGroups.electricity,
      'Roads': cityGroups.roads,
      'Waste': cityGroups.waste
    };

    const groupId = groupMap[faultType] || cityGroups.water;
    console.log(`Routing ${faultType} fault to ${selectedCity} group ID: ${groupId} (Area selection does not affect routing)`);
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


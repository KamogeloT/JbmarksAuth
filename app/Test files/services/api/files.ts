import axios from 'axios';
import RNFS from 'react-native-fs';
import apiClient from './client';
import { launchImageLibrary, launchCamera, ImagePickerResponse, MediaType } from 'react-native-image-picker';

export interface FileUploadResult {
  id: number;
  name: string;
  size: number;
  type: string;
  url: string;
}

/**
 * Upload file to Bitrix24 Drive
 * This is the first step before attaching a file to a task
 * 
 * @param fileUri - Local file URI (from device storage, camera, etc.)
 * @param folderId - Target folder ID in Bitrix24 Drive (optional, defaults to user's root folder)
 * @returns File ID that can be used with tasks.task.files.attach
 */
export async function uploadFile(
  fileUri: string,
  fileName: string,
  folderId?: number
): Promise<FileUploadResult> {
  try {
    // Read file as Base64 (Bitrix24 requires Base64 encoding)
    const base64Content = await RNFS.readFile(fileUri, 'base64');

    // Get file info
    const fileType = fileName.split('.').pop()?.toLowerCase() || '';
    const mimeType = getMimeType(fileType);

    // Prepare payload according to Bitrix24 API specification
    const payload: any = {
      id: folderId || 1, // Default to root folder if no ID is specified
      data: {
        NAME: fileName,
      },
      fileContent: base64Content,
    };

    // Direct Bitrix24 REST API call
    const response = await apiClient.post('/rest/disk.storage.uploadfile', payload);

    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }

    const fileData = response.data.result;
    
    return {
      id: parseInt(fileData.ID),
      name: fileData.NAME,
      size: parseInt(fileData.SIZE),
      type: fileData.TYPE || mimeType,
      url: fileData.DOWNLOAD_URL || fileData.URL,
    };
  } catch (error: any) {
    console.error('File upload error:', error);
    throw new Error(error.message || 'Failed to upload file');
  }
}

/**
 * Pick and upload file from device
 * Opens device file picker, then uploads to Bitrix24
 */
export async function pickAndUploadFile(
  folderId?: number
): Promise<FileUploadResult> {
  // Document picker is temporarily disabled due to compatibility issues with React Native 0.81.5
  // The react-native-document-picker library requires GuardedResultAsyncTask which was removed in RN 0.74+
  // Workaround: Use image picker which supports documents on some platforms
  // TODO: Use react-native-picker-document or patch react-native-document-picker
  try {
    // Use image picker as fallback - it can pick documents on some platforms
    return await pickImageAndUpload(folderId);
  } catch (error: any) {
    console.error('File pick/upload error:', error);
    throw new Error('Document picker is currently unavailable. Please use image picker or update the library.');
  }
}

/**
 * Take photo and upload to Bitrix24
 * Opens camera, takes photo, then uploads to Bitrix24 Drive
 * This is the mobile-specific feature for attaching photos to tasks
 */
export async function takePhotoAndUpload(
  folderId?: number
): Promise<FileUploadResult> {
  try {
    // Launch camera
    const result: ImagePickerResponse = await new Promise((resolve, reject) => {
      launchCamera(
        {
          mediaType: 'photo' as MediaType,
      quality: 0.8,
          saveToPhotos: false,
        },
        (response) => {
          if (response.didCancel) {
            reject(new Error('Photo capture cancelled'));
          } else if (response.errorMessage) {
            reject(new Error(response.errorMessage));
          } else {
            resolve(response);
          }
        }
      );
    });

    if (!result.assets || result.assets.length === 0) {
      throw new Error('No photo captured');
    }

    const photo = result.assets[0];
    const fileName = photo.fileName || `photo_${Date.now()}.jpg`;
    
    return await uploadFile(photo.uri || '', fileName, folderId);
  } catch (error: any) {
    console.error('Photo capture/upload error:', error);
    throw new Error(error.message || 'Failed to take and upload photo');
  }
}

/**
 * Pick image from gallery and upload
 */
export async function pickImageAndUpload(
  folderId?: number
): Promise<FileUploadResult> {
  try {
    // Launch image picker
    const result: ImagePickerResponse = await new Promise((resolve, reject) => {
      launchImageLibrary(
        {
          mediaType: 'photo' as MediaType,
      quality: 0.8,
        },
        (response) => {
          if (response.didCancel) {
            reject(new Error('Image selection cancelled'));
          } else if (response.errorMessage) {
            reject(new Error(response.errorMessage));
          } else {
            resolve(response);
          }
        }
      );
    });

    if (!result.assets || result.assets.length === 0) {
      throw new Error('No image selected');
    }

    const image = result.assets[0];
    const fileName = image.fileName || `image_${Date.now()}.jpg`;
    
    return await uploadFile(image.uri || '', fileName, folderId);
  } catch (error: any) {
    console.error('Image pick/upload error:', error);
    throw new Error(error.message || 'Failed to pick and upload image');
  }
}

/**
 * Get MIME type from file extension
 */
function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    
    // Text
    txt: 'text/plain',
    csv: 'text/csv',
    
    // Archives
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
  };

  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

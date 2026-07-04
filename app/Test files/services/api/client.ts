import axios, { AxiosInstance, AxiosError } from 'axios';
import { Config } from '../../constants/config';
import { storage } from '../storage';
import { getAccessToken, refreshAccessToken, logout, getWebhookUrl } from './auth';

/**
 * API Client - Supports both Webhook and OAuth Authentication
 * Automatically detects which authentication method is being used
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: Config.bitrix24.portalUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add authentication to all requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Check if using webhook authentication
      const webhookUserId = await storage.getItem('bitrix_user_id');
      
      if (webhookUserId && config.url) {
        // Using webhook authentication
        // Webhook format: https://portal.com/rest/{userId}/{token}/endpoint.json
        const webhookToken = await storage.getItem(Config.storage.accessToken);
        if (webhookToken) {
          const webhookBaseUrl = `${Config.bitrix24.portalUrl}/rest/${webhookUserId}/${webhookToken}`;
          config.baseURL = webhookBaseUrl;
          // Remove /rest/ prefix from URL since it's in baseURL, and add .json suffix
          if (config.url.startsWith('/rest/')) {
            config.url = config.url.replace('/rest/', '/');
          }
          if (!config.url.endsWith('.json')) {
            config.url = config.url + '.json';
          }
          console.log('🔐 Using webhook auth:', webhookBaseUrl);
        } else {
          console.error('⚠️ Webhook user ID found but no webhook token');
        }
      } else {
        // Using OAuth authentication
        // OAuth format: https://portal.com/rest/endpoint?auth=token
        const accessToken = await getAccessToken();
        if (accessToken && config.url) {
          // Bitrix24 REST API uses ?auth=token parameter for OAuth
          config.params = { ...config.params, auth: accessToken };
          console.log('🔐 Using OAuth token for:', config.url.substring(0, 100));
        } else {
          console.error('⚠️ No access token found for OAuth authentication');
          console.error('   webhookUserId:', webhookUserId);
          console.error('   accessToken:', accessToken ? 'Found' : 'Not found');
        }
      }
    } catch (error) {
      console.error('Error setting up authentication:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
apiClient.interceptors.response.use(
  (response) => {
    // Bitrix24 returns errors in the response body
    if (response.data?.error) {
      return Promise.reject({
        message: response.data.error_description || response.data.error,
        code: response.data.error,
      });
    }
    return response;
  },
  async (error: AxiosError) => {
    // Only try token refresh for OAuth (not webhook)
    const webhookUserId = await storage.getItem('bitrix_user_id');
    
    if (!webhookUserId && error.response?.status === 401) {
      // OAuth token expired - try to refresh
      try {
        const result = await refreshAccessToken();
        if (result.success && result.accessToken && error.config) {
          // Update the request URL with new token
          if (error.config.params) {
            error.config.params.auth = result.accessToken;
          }
          // Retry the original request with new token
          return apiClient.request(error.config);
        }
      } catch (refreshError) {
        // Refresh failed - clear tokens (logout will handle redirect)
        await logout();
      }
    }
    
    return Promise.reject({
      message: error.message || 'An error occurred',
      status: error.response?.status,
      data: error.response?.data,
    });
  }
);

/**
 * Webhook client for simpler authentication (admin/testing only)
 * Use this for direct webhook-based API calls
 */
export const createWebhookClient = (userId: string, token: string) => {
  const webhookUrl = `${Config.bitrix24.portalUrl}/rest/${userId}/${token}`;
  
  return axios.create({
    baseURL: webhookUrl,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export default apiClient;

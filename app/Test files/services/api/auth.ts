import axios from 'axios';
import { Linking, Platform } from 'react-native';
import { Config } from '../../constants/config';
import { User } from '../../types';
import { storage } from '../storage';

export interface LoginResponse {
  success: boolean;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * OAuth 2.0 Authorization Flow (Direct Bitrix24 Access)
 * Mobile app → Bitrix24 (direct)
 * 
 * ⚠️ SECURITY NOTE: This stores client_secret in the mobile app.
 * For production, consider using a backend server instead.
 */
export async function loginWithOAuth(): Promise<LoginResponse> {
  try {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      return {
        success: false,
        error: 'OAuth login is only supported on mobile devices',
      };
    }

    const portalUrl = Config.bitrix24.portalUrl;
    const clientId = Config.bitrix24.clientId;
    
    // Generate redirect URI for OAuth callback
    const redirectUri = Platform.select({
      ios: 'jbmarks://oauth/callback',
      android: 'jbmarks://oauth/callback',
      default: 'jbmarks://oauth/callback',
    });

    // Step 1: Build authorization URL
    const authUrl = `${portalUrl}${Config.bitrix24.endpoints.auth}?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}`;

    console.log('🔐 OAuth Configuration:');
    console.log('  Redirect URI:', redirectUri);
    console.log('  Auth URL:', authUrl);
    console.log('⚠️  IMPORTANT: Make sure Bitrix24 OAuth app has this exact redirect URI configured:');
    console.log('  →', redirectUri);

    // Step 2: Open browser for user to authorize
    // Use React Native Linking to open browser
    const canOpen = await Linking.canOpenURL(authUrl);
    if (!canOpen) {
      return {
        success: false,
        error: 'Cannot open authorization URL',
      };
    }

    // Open browser and wait for deep link callback
    await Linking.openURL(authUrl);
    
    // For React Native, we need to listen for the deep link
    // This is a simplified version - in production, you'd set up proper deep link handling
    return new Promise((resolve) => {
      const subscription = Linking.addEventListener('url', (event) => {
        subscription.remove();
        const code = extractCodeFromUrl(event.url);
    
    if (!code) {
          resolve({
        success: false,
        error: 'Authorization code not found in callback',
          });
          return;
    }

        // Continue with token exchange
        exchangeCodeForTokens(code, redirectUri).then((tokenResult) => {
    if (!tokenResult.success || !tokenResult.tokens) {
            resolve({
        success: false,
        error: tokenResult.error || 'Failed to exchange code for tokens',
            });
            return;
    }

    const { access_token, refresh_token } = tokenResult.tokens;
          getUserInfo(access_token).then((userResult) => {
    if (!userResult.success || !userResult.user) {
              resolve({
        success: false,
        error: userResult.error || 'Failed to get user information',
              });
              return;
    }

            // Store tokens and user data
            storage.setItem(Config.storage.accessToken, access_token);
            storage.setItem(Config.storage.refreshToken, refresh_token);
            storage.setItem('bitrix_portal_url', portalUrl);
            storage.setItem(Config.storage.user, JSON.stringify(userResult.user));

            resolve({
      success: true,
      user: userResult.user,
      accessToken: access_token,
      refreshToken: refresh_token,
            });
          });
        });
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        subscription.remove();
        resolve({
          success: false,
          error: 'Authorization timeout',
        });
      }, 300000);
    });
  } catch (error: any) {
    console.error('OAuth login error:', error);
    return {
      success: false,
      error: error.message || 'OAuth login failed. Please try again.',
    };
  }
}

/**
 * Extract authorization code from OAuth callback URL
 */
function extractCodeFromUrl(url: string): string | null {
  try {
    // Handle both http/https URLs and custom scheme URLs (jbmarks://)
    let urlObj: URL;
    if (url.startsWith('jbmarks://')) {
      // For custom schemes, we need to parse manually or convert to a format URL can handle
      // Replace custom scheme with http temporarily for parsing
      urlObj = new URL(url.replace('jbmarks://', 'http://'));
    } else {
      urlObj = new URL(url);
    }
    
    const code = urlObj.searchParams.get('code') || 
                 urlObj.searchParams.get('?code') ||
                 url.split('code=')[1]?.split('&')[0]?.split('#')[0];
    
    console.log('Extracted code from URL:', code ? 'Found' : 'Not found', url.substring(0, 100));
    return code;
  } catch (error) {
    console.error('Error parsing callback URL:', error, url);
    // Fallback: try to extract code manually
    const codeMatch = url.match(/[?&]code=([^&?#]+)/);
    return codeMatch ? codeMatch[1] : null;
  }
}

/**
 * Exchange authorization code for access and refresh tokens
 */
async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{ success: boolean; tokens?: TokenResponse; error?: string }> {
  try {
    const portalUrl = Config.bitrix24.portalUrl;
    const clientId = Config.bitrix24.clientId;
    const clientSecret = Config.bitrix24.clientSecret;

    // Bitrix24 OAuth token endpoint requires form-urlencoded format
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('code', code);
    params.append('redirect_uri', redirectUri);

    const response = await axios.post<TokenResponse>(
      `${portalUrl}${Config.bitrix24.endpoints.token}`,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (response.data.access_token) {
      return {
        success: true,
        tokens: response.data,
      };
    }

    return {
      success: false,
      error: 'Invalid token response',
    };
  } catch (error: any) {
    console.error('Token exchange error:', error);
    
    let errorMessage = 'Failed to exchange authorization code';
    if (error.response?.data?.error_description) {
      errorMessage = error.response.data.error_description;
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Get user information using OAuth access token
 */
async function getUserInfo(
  accessToken: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const portalUrl = Config.bitrix24.portalUrl;
    const response = await axios.get(
      `${portalUrl}/rest/user.current.json`,
      {
        params: {
          auth: accessToken,
        },
      }
    );

    if (response.data.error) {
      return {
        success: false,
        error: response.data.error_description || 'Failed to get user info',
      };
    }

    const userData = response.data.result;
    const user: User = {
      id: parseInt(userData.ID),
      name: userData.NAME || '',
      lastName: userData.LAST_NAME || '',
      email: userData.EMAIL || '',
      workPosition: userData.WORK_POSITION || '',
      personalPhoto: userData.PERSONAL_PHOTO || '',
      active: userData.ACTIVE === 'Y' || userData.ACTIVE === true,
      login: userData.LOGIN || '',
    };

    return {
      success: true,
      user,
    };
  } catch (error: any) {
    console.error('Get user info error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get user information',
    };
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<{
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}> {
  try {
    const refreshToken = await storage.getItem(Config.storage.refreshToken);
    
    if (!refreshToken) {
      return {
        success: false,
        error: 'No refresh token available',
      };
    }

    const portalUrl = Config.bitrix24.portalUrl;
    const clientId = Config.bitrix24.clientId;
    const clientSecret = Config.bitrix24.clientSecret;

    // Bitrix24 OAuth token endpoint requires form-urlencoded format
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('refresh_token', refreshToken);

    const response = await axios.post<TokenResponse>(
      `${portalUrl}${Config.bitrix24.endpoints.token}`,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (response.data.access_token) {
      const newAccessToken = response.data.access_token;
      const newRefreshToken = response.data.refresh_token || refreshToken;

      // Update stored tokens
      await storage.setItem(Config.storage.accessToken, newAccessToken);
      if (response.data.refresh_token) {
        await storage.setItem(Config.storage.refreshToken, newRefreshToken);
      }

      return {
        success: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    }

    return {
      success: false,
      error: 'Invalid token response',
    };
  } catch (error: any) {
    console.error('Token refresh error:', error);
    
    // If refresh fails, clear tokens and require re-authentication
    await logout();
    
    return {
      success: false,
      error: error.response?.data?.error_description || 'Token refresh failed',
    };
  }
}

/**
 * Webhook-based authentication (for admin/testing only)
 * WARNING: This should NOT be used for user login in production
 * It's only suitable for single-account server-side integrations
 */
export async function loginWithWebhook(
  portalUrl: string,
  userId: string,
  token: string
): Promise<LoginResponse> {
  try {
    const webhookUrl = `${portalUrl}/rest/${userId}/${token}/user.current.json`;
    const response = await axios.get(webhookUrl);
    
    if (response.data.error) {
      return {
        success: false,
        error: response.data.error_description || 'Authentication failed',
      };
    }
    
    const userData = response.data.result;
    
    const user: User = {
      id: parseInt(userData.ID),
      name: userData.NAME || '',
      lastName: userData.LAST_NAME || '',
      email: userData.EMAIL || '',
      workPosition: userData.WORK_POSITION || '',
      personalPhoto: userData.PERSONAL_PHOTO || '',
      active: userData.ACTIVE === 'Y' || userData.ACTIVE === true,
      login: userData.LOGIN || '',
    };
    
    // Store webhook token (for admin use only)
    await storage.setItem(Config.storage.accessToken, token);
    await storage.setItem('bitrix_portal_url', portalUrl);
    await storage.setItem('bitrix_user_id', userId);
    await storage.setItem(Config.storage.user, JSON.stringify(user));
    
    return {
      success: true,
      user,
      accessToken: token,
    };
  } catch (error: any) {
    console.error('Webhook login error:', error);
    
    let errorMessage = 'Failed to connect to Bitrix24';
    
    if (error.response?.status === 401) {
      errorMessage = 'Invalid webhook credentials.';
    } else if (error.response?.status === 404) {
      errorMessage = 'Portal not found. Please check your URL.';
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Get stored user
export async function getStoredUser(): Promise<User | null> {
  try {
    const userJson = await storage.getItem(Config.storage.user);
    if (userJson) {
      return JSON.parse(userJson);
    }
    return null;
  } catch (error) {
    console.error('Error getting stored user:', error);
    return null;
  }
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  try {
    const token = await storage.getItem(Config.storage.accessToken);
    const user = await storage.getItem(Config.storage.user);
    return !!token && !!user;
  } catch (error) {
    return false;
  }
}

// Get current access token
export async function getAccessToken(): Promise<string | null> {
  try {
    return await storage.getItem(Config.storage.accessToken);
  } catch (error) {
    return null;
  }
}

// Logout
export async function logout(): Promise<void> {
  try {
    await storage.deleteItem(Config.storage.accessToken);
    await storage.deleteItem(Config.storage.refreshToken);
    await storage.deleteItem(Config.storage.user);
    await storage.deleteItem('bitrix_portal_url');
    await storage.deleteItem('bitrix_user_id');
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// Get webhook URL for API calls (legacy support)
export function getWebhookUrl(): string {
  return `${Config.bitrix24.portalUrl}/rest/${Config.bitrix24.webhookUserId}/${Config.bitrix24.webhookToken}`;
}

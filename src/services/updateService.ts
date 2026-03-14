import { App } from '@capacitor/app';

export interface AppVersion {
  current: string;
  latest: string;
  updateRequired: boolean;
  updateAvailable: boolean;
}

class UpdateService {
  // Latest version available (update this when you release new versions)
  // In production, this should come from your server/API
  private readonly LATEST_VERSION = '1.5.1';
  
  // Minimum required version (users below this MUST update)
  private readonly MINIMUM_REQUIRED_VERSION = '1.0';

  /**
   * Check if an update is available
   */
  async checkForUpdates(): Promise<AppVersion> {
    try {
      console.log('🔍 Checking for app updates...');
      
      // Get current app version
      const info = await App.getInfo();
      const currentVersion = info.version;
      
      console.log('📱 Current version:', currentVersion);
      console.log('🆕 Latest version:', this.LATEST_VERSION);
      console.log('⚠️ Minimum required version:', this.MINIMUM_REQUIRED_VERSION);
      
      // Compare versions
      const updateRequired = this.isVersionLower(currentVersion, this.MINIMUM_REQUIRED_VERSION);
      const updateAvailable = this.isVersionLower(currentVersion, this.LATEST_VERSION);
      
      return {
        current: currentVersion,
        latest: this.LATEST_VERSION,
        updateRequired,
        updateAvailable
      };
    } catch (error) {
      console.error('❌ Error checking for updates:', error);
      return {
        current: '0.0.0',
        latest: this.LATEST_VERSION,
        updateRequired: false,
        updateAvailable: false
      };
    }
  }

  /**
   * Compare two version strings
   * Returns true if version1 < version2
   */
  private isVersionLower(version1: string, version2: string): boolean {
    const v1Parts = version1.split('.').map(n => parseInt(n, 10) || 0);
    const v2Parts = version2.split('.').map(n => parseInt(n, 10) || 0);
    
    // Ensure both arrays have same length
    const maxLength = Math.max(v1Parts.length, v2Parts.length);
    while (v1Parts.length < maxLength) v1Parts.push(0);
    while (v2Parts.length < maxLength) v2Parts.push(0);
    
    for (let i = 0; i < maxLength; i++) {
      if (v1Parts[i] < v2Parts[i]) return true;
      if (v1Parts[i] > v2Parts[i]) return false;
    }
    
    return false; // Versions are equal
  }

  /**
   * Show update dialog to user
   */
  async promptUpdate(versionInfo: AppVersion): Promise<void> {
    if (versionInfo.updateRequired) {
      // Critical update - user MUST update
      alert(
        `⚠️ UPDATE REQUIRED\n\n` +
        `A critical update is required to continue using SDINMOTION.\n\n` +
        `Current version: ${versionInfo.current}\n` +
        `Required version: ${this.MINIMUM_REQUIRED_VERSION}\n\n` +
        `Please update from the Play Store.`
      );
      
      // Open Play Store
      this.openPlayStore();
    } else if (versionInfo.updateAvailable) {
      // Optional update available
      const shouldUpdate = confirm(
        `🆕 UPDATE AVAILABLE\n\n` +
        `A new version of SDINMOTION is available!\n\n` +
        `Current version: ${versionInfo.current}\n` +
        `New version: ${versionInfo.latest}\n\n` +
        `Would you like to update now?`
      );
      
      if (shouldUpdate) {
        this.openPlayStore();
      }
    } else {
      console.log('✅ App is up to date');
    }
  }

  /**
   * Open the app's Play Store page
   */
  private openPlayStore(): void {
    const packageName = 'com.municipality.faultreporter';
    const playStoreUrl = `market://details?id=${packageName}`;
    const webPlayStoreUrl = `https://play.google.com/store/apps/details?id=${packageName}`;
    
    // Try to open Play Store app first, fallback to web
    window.location.href = playStoreUrl;
    
    // Fallback to web if Play Store app doesn't open
    setTimeout(() => {
      window.open(webPlayStoreUrl, '_system');
    }, 500);
  }

  /**
   * Check for updates and prompt user if needed
   * Call this during app startup (e.g., splash screen)
   */
  async checkAndPromptForUpdates(): Promise<void> {
    try {
      const versionInfo = await this.checkForUpdates();
      
      if (versionInfo.updateRequired || versionInfo.updateAvailable) {
        await this.promptUpdate(versionInfo);
      }
    } catch (error) {
      console.error('❌ Error in update check flow:', error);
      // Don't block app startup if update check fails
    }
  }
}

export const updateService = new UpdateService();


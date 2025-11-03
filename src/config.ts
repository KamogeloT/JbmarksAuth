// Configuration file for the Fault Reporting Mobile App

export interface AppConfig {
  bitrix24: {
    webhookUrl: string;
    defaultUserId: string;
    groups: {
      water: string;
      electricity: string;
      roads: string;
      waste: string;
    };
    // Optional: Override with specific folder IDs for direct upload
    driveFolders?: {
      water?: string;
      electricity?: string;
      roads?: string;
      waste?: string;
    };
  };
  app: {
    name: string;
    supportEmail: string;
    supportPhone: string;
  };
}

// Default configuration
// IMPORTANT: Update these values for your municipality
export const defaultConfig: AppConfig = {
  bitrix24: {
    webhookUrl: import.meta.env.VITE_BITRIX24_WEBHOOK_URL || 
      '',
    defaultUserId: import.meta.env.VITE_BITRIX24_USER_ID || '1',
    groups: {
      water: import.meta.env.VITE_BITRIX24_GROUP_WATER || '5',
      electricity: import.meta.env.VITE_BITRIX24_GROUP_ELECTRICITY || '6',
      roads: import.meta.env.VITE_BITRIX24_GROUP_ROADS || '7',
      waste: import.meta.env.VITE_BITRIX24_GROUP_WASTE || '8',
    },
    // Optional: Provide specific folder IDs to bypass automatic storage lookup
    driveFolders: {
      water: import.meta.env.VITE_BITRIX24_DRIVE_FOLDER_WATER,
      electricity: import.meta.env.VITE_BITRIX24_DRIVE_FOLDER_ELECTRICITY,
      roads: import.meta.env.VITE_BITRIX24_DRIVE_FOLDER_ROADS,
      waste: import.meta.env.VITE_BITRIX24_DRIVE_FOLDER_WASTE,
    },
  },
  app: {
    name: 'Municipal Fault Reporting',
    supportEmail: 'support@municipality.gov.za',
    supportPhone: '+27 18 297 5111',
  },
};

// Load config from window object if available (for runtime configuration)
export const config: AppConfig = typeof window !== 'undefined' && (window as any).APP_CONFIG
  ? { ...defaultConfig, ...(window as any).APP_CONFIG }
  : defaultConfig;


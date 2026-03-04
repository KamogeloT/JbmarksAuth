// Configuration file for the Fault Reporting Mobile App

export interface AppConfig {
  bitrix24: {
    webhookUrl: string;
    defaultUserId: string;
    groups: {
      // Nested by city, then by department
      Potchefstroom: {
        water: string;
        electricity: string;
        roads: string;
        waste: string;
      };
      Ventersdorp: {
        water: string;
        electricity: string;
        roads: string;
        waste: string;
      };
    };
    // Storage and Root Object IDs for direct Drive access
    storage: {
      Potchefstroom: {
        water: { storageId: string; rootObjectId: string };
        electricity: { storageId: string; rootObjectId: string };
        roads: { storageId: string; rootObjectId: string };
        waste: { storageId: string; rootObjectId: string };
      };
      Ventersdorp: {
        water: { storageId: string; rootObjectId: string };
        electricity: { storageId: string; rootObjectId: string };
        roads: { storageId: string; rootObjectId: string };
        waste: { storageId: string; rootObjectId: string };
      };
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
    version: string;
    versionCode: number;
    supportEmail: string;
    supportPhone: string;
  };
  areas: {
    types: ('Township' | 'Town')[];
    cities: ('Ventersdorp' | 'Potchefstroom')[];
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
      Potchefstroom: {
        water: import.meta.env.VITE_BITRIX24_GROUP_POTCHEFSTROOM_WATER || '6',
        electricity: import.meta.env.VITE_BITRIX24_GROUP_POTCHEFSTROOM_ELECTRICITY || '5',
        roads: import.meta.env.VITE_BITRIX24_GROUP_POTCHEFSTROOM_ROADS || '7',
        waste: import.meta.env.VITE_BITRIX24_GROUP_POTCHEFSTROOM_WASTE || '8',
      },
      Ventersdorp: {
        water: import.meta.env.VITE_BITRIX24_GROUP_VENTERSDORP_WATER || '2',
        electricity: import.meta.env.VITE_BITRIX24_GROUP_VENTERSDORP_ELECTRICITY || '1',
        roads: import.meta.env.VITE_BITRIX24_GROUP_VENTERSDORP_ROADS || '3',
        waste: import.meta.env.VITE_BITRIX24_GROUP_VENTERSDORP_WASTE || '4',
      },
    },
    storage: {
      Potchefstroom: {
        water: {
          storageId: import.meta.env.VITE_BITRIX24_STORAGE_POTCHEFSTROOM_WATER || '11',
          rootObjectId: import.meta.env.VITE_BITRIX24_ROOT_POTCHEFSTROOM_WATER || '23',
        },
        electricity: {
          storageId: import.meta.env.VITE_BITRIX24_STORAGE_POTCHEFSTROOM_ELECTRICITY || '10',
          rootObjectId: import.meta.env.VITE_BITRIX24_ROOT_POTCHEFSTROOM_ELECTRICITY || '22',
        },
        roads: {
          storageId: import.meta.env.VITE_BITRIX24_STORAGE_POTCHEFSTROOM_ROADS || '12',
          rootObjectId: import.meta.env.VITE_BITRIX24_ROOT_POTCHEFSTROOM_ROADS || '24',
        },
        waste: {
          storageId: import.meta.env.VITE_BITRIX24_STORAGE_POTCHEFSTROOM_WASTE || '13',
          rootObjectId: import.meta.env.VITE_BITRIX24_ROOT_POTCHEFSTROOM_WASTE || '25',
        },
      },
      Ventersdorp: {
        water: {
          storageId: import.meta.env.VITE_BITRIX24_STORAGE_VENTERSDORP_WATER || '7',
          rootObjectId: import.meta.env.VITE_BITRIX24_ROOT_VENTERSDORP_WATER || '19',
        },
        electricity: {
          storageId: import.meta.env.VITE_BITRIX24_STORAGE_VENTERSDORP_ELECTRICITY || '6',
          rootObjectId: import.meta.env.VITE_BITRIX24_ROOT_VENTERSDORP_ELECTRICITY || '18',
        },
        roads: {
          storageId: import.meta.env.VITE_BITRIX24_STORAGE_VENTERSDORP_ROADS || '8',
          rootObjectId: import.meta.env.VITE_BITRIX24_ROOT_VENTERSDORP_ROADS || '20',
        },
        waste: {
          storageId: import.meta.env.VITE_BITRIX24_STORAGE_VENTERSDORP_WASTE || '9',
          rootObjectId: import.meta.env.VITE_BITRIX24_ROOT_VENTERSDORP_WASTE || '21',
        },
      },
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
    name: 'SDINMOTION',
    version: '1.7.9',
    versionCode: 19,
    supportEmail: 'support@municipality.gov.za',
    supportPhone: '+27 18 297 5111',
  },
  areas: {
    types: ['Township', 'Town'],
    cities: ['Ventersdorp', 'Potchefstroom'],
  },
};

// Load config from window object if available (for runtime configuration)
export const config: AppConfig = typeof window !== 'undefined' && (window as any).APP_CONFIG
  ? { ...defaultConfig, ...(window as any).APP_CONFIG }
  : defaultConfig;


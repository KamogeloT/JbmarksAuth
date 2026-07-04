/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_BITRIX24_WEBHOOK_URL?: string
  readonly VITE_BITRIX24_USER_ID?: string

  // Group IDs per city
  readonly VITE_BITRIX24_GROUP_POTCHEFSTROOM_WATER?: string
  readonly VITE_BITRIX24_GROUP_POTCHEFSTROOM_ELECTRICITY?: string
  readonly VITE_BITRIX24_GROUP_POTCHEFSTROOM_ROADS?: string
  readonly VITE_BITRIX24_GROUP_POTCHEFSTROOM_WASTE?: string
  readonly VITE_BITRIX24_GROUP_VENTERSDORP_WATER?: string
  readonly VITE_BITRIX24_GROUP_VENTERSDORP_ELECTRICITY?: string
  readonly VITE_BITRIX24_GROUP_VENTERSDORP_ROADS?: string
  readonly VITE_BITRIX24_GROUP_VENTERSDORP_WASTE?: string

  // Storage IDs per city
  readonly VITE_BITRIX24_STORAGE_POTCHEFSTROOM_WATER?: string
  readonly VITE_BITRIX24_STORAGE_POTCHEFSTROOM_ELECTRICITY?: string
  readonly VITE_BITRIX24_STORAGE_POTCHEFSTROOM_ROADS?: string
  readonly VITE_BITRIX24_STORAGE_POTCHEFSTROOM_WASTE?: string
  readonly VITE_BITRIX24_STORAGE_VENTERSDORP_WATER?: string
  readonly VITE_BITRIX24_STORAGE_VENTERSDORP_ELECTRICITY?: string
  readonly VITE_BITRIX24_STORAGE_VENTERSDORP_ROADS?: string
  readonly VITE_BITRIX24_STORAGE_VENTERSDORP_WASTE?: string

  // Root Object IDs per city
  readonly VITE_BITRIX24_ROOT_POTCHEFSTROOM_WATER?: string
  readonly VITE_BITRIX24_ROOT_POTCHEFSTROOM_ELECTRICITY?: string
  readonly VITE_BITRIX24_ROOT_POTCHEFSTROOM_ROADS?: string
  readonly VITE_BITRIX24_ROOT_POTCHEFSTROOM_WASTE?: string
  readonly VITE_BITRIX24_ROOT_VENTERSDORP_WATER?: string
  readonly VITE_BITRIX24_ROOT_VENTERSDORP_ELECTRICITY?: string
  readonly VITE_BITRIX24_ROOT_VENTERSDORP_ROADS?: string
  readonly VITE_BITRIX24_ROOT_VENTERSDORP_WASTE?: string

  // Drive folder overrides
  readonly VITE_BITRIX24_DRIVE_FOLDER_WATER?: string
  readonly VITE_BITRIX24_DRIVE_FOLDER_ELECTRICITY?: string
  readonly VITE_BITRIX24_DRIVE_FOLDER_ROADS?: string
  readonly VITE_BITRIX24_DRIVE_FOLDER_WASTE?: string

  // Legacy (kept for backward compat)
  readonly VITE_BITRIX24_GROUP_WATER?: string
  readonly VITE_BITRIX24_GROUP_ELECTRICITY?: string
  readonly VITE_BITRIX24_GROUP_ROADS?: string
  readonly VITE_BITRIX24_GROUP_WASTE?: string
  readonly VITE_BITRIX24_DISK_FOLDER_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

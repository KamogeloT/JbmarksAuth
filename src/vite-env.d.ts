/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_BITRIX24_WEBHOOK_URL?: string
  readonly VITE_BITRIX24_USER_ID?: string
  readonly VITE_BITRIX24_GROUP_WATER?: string
  readonly VITE_BITRIX24_GROUP_ELECTRICITY?: string
  readonly VITE_BITRIX24_GROUP_ROADS?: string
  readonly VITE_BITRIX24_GROUP_WASTE?: string
  readonly VITE_BITRIX24_DISK_FOLDER_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}


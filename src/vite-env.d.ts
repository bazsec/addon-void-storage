/// <reference types="vite/client" />

interface ElectronAPI {
    scanWowDirs: (version?: 'retail' | 'classic') => Promise<string | null>
    selectWowDir: (version?: 'retail' | 'classic') => Promise<string | null>
    selectStorageDir: () => Promise<string | null>
    getProfiles: (version?: 'retail' | 'classic') => Promise<{ id: string; name: string; createdAt: string }[]>
    createBackup: (name: string, version?: 'retail' | 'classic') => Promise<{ id: string; name: string; createdAt: string }>
    updateBackup: (id: string, version?: 'retail' | 'classic') => Promise<{ id: string; name: string; updatedAt: string }>
    restoreBackup: (id: string, version?: 'retail' | 'classic') => Promise<boolean>
    deleteBackup: (id: string, version?: 'retail' | 'classic') => Promise<boolean>
    getStoreValue: (key: string) => Promise<any>
    setStoreValue: (key: string, value: any) => Promise<boolean>
    resetApp: (fullReset?: boolean) => Promise<boolean>
    openFolder: (id: string, version?: 'retail' | 'classic') => Promise<boolean>
    saveProfileOrder: (ids: string[], version?: 'retail' | 'classic') => Promise<boolean>
    wipeInterface: (version?: 'retail' | 'classic') => Promise<boolean>
    getProfileAddons: (id: string, version?: 'retail' | 'classic') => Promise<Array<{ name: string; url: string | null; source: string | null }>>
    openExternal: (url: string) => Promise<boolean>
}

interface Window {
    electron: ElectronAPI
}

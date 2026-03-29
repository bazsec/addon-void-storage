import { contextBridge, ipcRenderer } from 'electron';

// Explicitly define the types for better intellisense compatibility if we were using a .d.ts
// But for now, we just expose the API.

contextBridge.exposeInMainWorld('electron', {
    scanWowDirs: (version?: 'retail' | 'classic') => ipcRenderer.invoke('scan-wow-dirs', version),
    selectWowDir: (version?: 'retail' | 'classic') => ipcRenderer.invoke('select-wow-dir', version),
    selectStorageDir: () => ipcRenderer.invoke('select-storage-dir'),
    getProfiles: (version?: 'retail' | 'classic') => ipcRenderer.invoke('get-profiles', version),
    createBackup: (name: string, version?: 'retail' | 'classic') => ipcRenderer.invoke('create-backup', name, version),
    updateBackup: (id: string, version?: 'retail' | 'classic') => ipcRenderer.invoke('update-backup', id, version),
    restoreBackup: (id: string, version?: 'retail' | 'classic') => ipcRenderer.invoke('restore-backup', id, version),
    deleteBackup: (id: string, version?: 'retail' | 'classic') => ipcRenderer.invoke('delete-backup', id, version),
    getStoreValue: (key: string) => ipcRenderer.invoke('get-store-value', key),
    setStoreValue: (key: string, value: any) => ipcRenderer.invoke('set-store-value', key, value),
    resetApp: (fullReset?: boolean) => ipcRenderer.invoke('reset-app', fullReset),
    openFolder: (id: string, version?: 'retail' | 'classic') => ipcRenderer.invoke('open-folder', id, version),
    saveProfileOrder: (ids: string[], version?: 'retail' | 'classic') => ipcRenderer.invoke('save-profile-order', ids, version),
    wipeInterface: (version?: 'retail' | 'classic') => ipcRenderer.invoke('wipe-interface', version),
    getProfileAddons: (id: string, version?: 'retail' | 'classic') => ipcRenderer.invoke('get-profile-addons', id, version),
    openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
});

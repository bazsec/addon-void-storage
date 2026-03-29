import path from 'path';
import fs from 'fs-extra';
import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import Store from 'electron-store';
import type { IpcMainInvokeEvent } from 'electron';

const store = new Store();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (process.platform === 'win32') {
    try {
        if (require('electron-squirrel-startup')) {
            app.quit();
        }
    } catch {
        // electron-squirrel-startup not available outside Windows installers
    }
}

function createWindow() {
    const isMac = process.platform === 'darwin';

    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        autoHideMenuBar: true,
        backgroundColor: '#09090b',
        titleBarStyle: 'hidden',
        ...(isMac
            ? { trafficLightPosition: { x: 12, y: 12 } }
            : {
                titleBarOverlay: {
                    color: '#09090b',
                    symbolColor: '#ffffff',
                    height: 40
                }
            }
        ),
    });

    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    setupIpcHandlers();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

function setupIpcHandlers() {
    // Helper to get storage path
    function getStoragePath(version: 'retail' | 'classic' = 'retail') {
        const basePath = (store.get('storagePath') as string) || path.join(app.getPath('userData'), 'profiles');
        return path.join(basePath, version);
    }

    // Helper to get WoW path based on version
    function getWowPath(version: 'retail' | 'classic' = 'retail') {
        if (version === 'classic') return store.get('classicPath') as string;
        return store.get('wowPath') as string;
    }

    // Select WoW Directory
    ipcMain.handle('select-wow-dir', async (_event: IpcMainInvokeEvent, version: 'retail' | 'classic' = 'retail') => {
        const isMac = process.platform === 'darwin';
        const title = version === 'classic' ? 'Select World of Warcraft "_classic_" Directory' : 'Select World of Warcraft "_retail_" Directory';

        // Platform-specific executables/app bundles to validate against
        const expectedFiles = isMac
            ? (version === 'classic'
                ? ['World of Warcraft Classic.app', 'WoWClassic.app']
                : ['World of Warcraft.app', 'Wow.app'])
            : (version === 'classic'
                ? ['WowClassic.exe']
                : ['Wow.exe']);

        const result = await dialog.showOpenDialog({
            properties: ['openDirectory'],
            title: title,
        });

        if (result.canceled) return null;

        const selectedPath = result.filePaths[0];

        // Validation: Check for executable or .app bundle
        let valid = false;
        for (const file of expectedFiles) {
            if (await fs.pathExists(path.join(selectedPath, file))) {
                valid = true;
                break;
            }
        }

        // Fallback: accept if Interface + WTF folders exist
        if (!valid) {
            const hasInterface = await fs.pathExists(path.join(selectedPath, 'Interface'));
            const hasWTF = await fs.pathExists(path.join(selectedPath, 'WTF'));
            if (hasInterface && hasWTF) valid = true;
        }

        if (!valid) {
            dialog.showErrorBox(
                "Invalid Directory",
                `The selected folder does not appear to be a valid WoW ${version} directory. Please select the correct ${version === 'classic' ? '_classic_' : '_retail_'} folder.`
            );
            return null;
        }

        if (version === 'classic') {
            store.set('classicPath', selectedPath);
        } else {
            store.set('wowPath', selectedPath);
        }
        return selectedPath;
    });

    // Scan WoW Directories
    ipcMain.handle('scan-wow-dirs', async (_event: IpcMainInvokeEvent, version: 'retail' | 'classic' = 'retail') => {
        const isMac = process.platform === 'darwin';
        const suffixes = version === 'classic' ? ['_classic_', '_classic_era_', '_classic_ptr_'] : ['_retail_', '_retail_ptr_'];

        const possibleExes = isMac
            ? (version === 'classic'
                ? ['World of Warcraft Classic.app', 'WoWClassic.app']
                : ['World of Warcraft.app', 'Wow.app'])
            : (version === 'classic'
                ? ['WowClassic.exe', 'Wow.exe']
                : ['Wow.exe']);

        const commonRoots = isMac
            ? [
                '/Applications/World of Warcraft',
                path.join(app.getPath('home'), 'Applications/World of Warcraft'),
            ]
            : [
                'C:\\Program Files (x86)\\World of Warcraft',
                'C:\\Program Files\\World of Warcraft',
                'C:\\World of Warcraft',
                'D:\\World of Warcraft',
                'E:\\World of Warcraft',
                'D:\\Games\\World of Warcraft',
                'E:\\Games\\World of Warcraft'
            ];

        for (const root of commonRoots) {
            for (const suffix of suffixes) {
                const fullPath = path.join(root, suffix);
                const exists = await fs.pathExists(fullPath);

                if (exists) {
                    // Check for executable
                    let valid = false;
                    for (const exe of possibleExes) {
                        if (await fs.pathExists(path.join(fullPath, exe))) {
                            valid = true;
                            break;
                        }
                    }

                    // Fallback: Check for Interface + WTF if exe missing (e.g. specialized clients or just missing)
                    if (!valid) {
                        const hasInterface = await fs.pathExists(path.join(fullPath, 'Interface'));
                        const hasWTF = await fs.pathExists(path.join(fullPath, 'WTF'));
                        if (hasInterface && hasWTF) valid = true;
                    }

                    // Ultimate Fallback: Just trust the directory if it's not empty and matches a known suffix.
                    if (!valid) {
                        try {
                            const files = await fs.readdir(fullPath);
                            // If it has files and matches our search suffix, trust it.
                            if (files.length > 0) {
                                valid = true;
                            }
                        } catch (e) { console.error('Error reading dir during fallback:', e); }
                    }

                    if (valid) {
                        if (version === 'classic') store.set('classicPath', fullPath);
                        else store.set('wowPath', fullPath);
                        return fullPath;
                    }
                }
            }
        }
        return null;
    });

    // Select Storage Directory
    ipcMain.handle('select-storage-dir', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory', 'createDirectory'],
            title: 'Select Profile Storage Location',
        });

        if (result.canceled) return null;

        const selectedPath = result.filePaths[0];
        store.set('storagePath', selectedPath);
        return selectedPath;
    });

    // Get Store Value
    ipcMain.handle('get-store-value', (_event: IpcMainInvokeEvent, key: string) => {
        if (key === 'storagePath') return (store.get('storagePath') as string) || path.join(app.getPath('userData'), 'profiles');
        return store.get(key);
    });

    // Set Store Value
    ipcMain.handle('set-store-value', (_event: IpcMainInvokeEvent, key: string, value: any) => {
        store.set(key, value);
        return true;
    });

    // Get Profiles
    ipcMain.handle('get-profiles', async (_event: IpcMainInvokeEvent, version: 'retail' | 'classic' = 'retail') => {
        const storagePath = getStoragePath(version);
        await fs.ensureDir(storagePath);

        const entries = await fs.readdir(storagePath, { withFileTypes: true });
        const profiles = await Promise.all(entries
            .filter(dirent => dirent.isDirectory())
            .map(async (dirent) => {
                const stats = await fs.stat(path.join(storagePath, dirent.name));
                return {
                    id: dirent.name, // Use folder name as ID for simplicity
                    name: dirent.name,
                    createdAt: stats.birthtime.toISOString(),
                };
            }));

        const savedOrder = store.get(version === 'classic' ? 'classicOrder' : 'retailOrder') as string[] | undefined;

        const sortedProfiles = profiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (savedOrder && Array.isArray(savedOrder)) {
            const profileMap = new Map(sortedProfiles.map(p => [p.id, p]));
            const orderedProfiles: typeof sortedProfiles = [];
            const seenIds = new Set<string>();

            // 1. Add items from saved order if they still exist
            for (const id of savedOrder) {
                const p = profileMap.get(id);
                if (p) {
                    orderedProfiles.push(p);
                    seenIds.add(id);
                }
            }

            // 2. Add any new/remaining items (newest first)
            const remainingProfiles = sortedProfiles.filter(p => !seenIds.has(p.id));

            // Return: New items first, then ordered items
            return [...remainingProfiles, ...orderedProfiles];
        }

        return sortedProfiles;
    });

    // Save Profile Order
    ipcMain.handle('save-profile-order', async (_event: IpcMainInvokeEvent, ids: string[], version: 'retail' | 'classic' = 'retail') => {
        const key = version === 'classic' ? 'classicOrder' : 'retailOrder';
        store.set(key, ids);
        return true;
    });

    // Create Backup
    ipcMain.handle('create-backup', async (_event: IpcMainInvokeEvent, name: string, version: 'retail' | 'classic' = 'retail') => {
        const wowPath = getWowPath(version);
        if (!wowPath) throw new Error('WoW path not set');

        // Sanitize name for folder usage
        const safeName = name.replace(/[^a-z0-9_\-\s]/gi, '').trim();
        if (!safeName) throw new Error('Invalid name');

        const storagePath = path.join(getStoragePath(version), safeName);

        if (await fs.pathExists(storagePath)) {
            throw new Error('Profile already exists');
        }

        await fs.ensureDir(storagePath);

        // Copy folders
        const sourceInterface = path.join(wowPath, 'Interface');
        const sourceWTF = path.join(wowPath, 'WTF');

        if (await fs.pathExists(sourceInterface)) {
            await fs.copy(sourceInterface, path.join(storagePath, 'Interface'));
        }
        if (await fs.pathExists(sourceWTF)) {
            await fs.copy(sourceWTF, path.join(storagePath, 'WTF'));
        }

        return { id: safeName, name: safeName, createdAt: new Date().toISOString() };
    });

    // Update Backup (Refresh existing backup with live settings)
    ipcMain.handle('update-backup', async (_event: IpcMainInvokeEvent, id: string, version: 'retail' | 'classic' = 'retail') => {
        const wowPath = getWowPath(version);
        if (!wowPath) throw new Error('WoW path not set');

        const profilePath = path.join(getStoragePath(version), id);
        if (!await fs.pathExists(profilePath)) throw new Error('Profile not found');

        // Clean existing folders in backup
        const targetInterface = path.join(profilePath, 'Interface');
        const targetWTF = path.join(profilePath, 'WTF');

        await fs.remove(targetInterface);
        await fs.remove(targetWTF);

        // Copy current live settings
        const sourceInterface = path.join(wowPath, 'Interface');
        const sourceWTF = path.join(wowPath, 'WTF');

        if (await fs.pathExists(sourceInterface)) {
            await fs.copy(sourceInterface, targetInterface);
        }
        if (await fs.pathExists(sourceWTF)) {
            await fs.copy(sourceWTF, targetWTF);
        }

        const stats = await fs.stat(profilePath);
        return {
            id,
            name: id,
            updatedAt: stats.mtime.toISOString(),
        };
    });

    // Restore Backup
    ipcMain.handle('restore-backup', async (_event: IpcMainInvokeEvent, id: string, version: 'retail' | 'classic' = 'retail') => {
        const wowPath = getWowPath(version);
        if (!wowPath) throw new Error('WoW path not set');

        const profilePath = path.join(getStoragePath(version), id);
        if (!await fs.pathExists(profilePath)) throw new Error('Profile not found');

        // 1. Backup current state to a "previous_state" temp folder? Or just overwrite?
        // "Void Storage" implies we might want to swap. But for now, let's just Overwrite (Delete + Copy).
        // Safer: Rename current to _backup_timestamp, then copy new.

        const timestamp = Date.now();
        const backupPath = path.join(app.getPath('userData'), 'backups', `auto_${version}_${timestamp}`);
        await fs.ensureDir(backupPath);

        const liveInterface = path.join(wowPath, 'Interface');
        const liveWTF = path.join(wowPath, 'WTF');

        // Move current to auto-backup
        if (await fs.pathExists(liveInterface)) {
            await fs.move(liveInterface, path.join(backupPath, 'Interface'));
        }
        if (await fs.pathExists(liveWTF)) {
            await fs.move(liveWTF, path.join(backupPath, 'WTF'));
        }

        // Copy profile to live (only if they exist in the backup)
        const profileInterface = path.join(profilePath, 'Interface');
        const profileWTF = path.join(profilePath, 'WTF');

        if (await fs.pathExists(profileInterface)) {
            await fs.copy(profileInterface, liveInterface);
        }
        if (await fs.pathExists(profileWTF)) {
            await fs.copy(profileWTF, liveWTF);
        }

        return true;
    });

    // Delete Backup
    ipcMain.handle('delete-backup', async (_event: IpcMainInvokeEvent, id: string, version: 'retail' | 'classic' = 'retail') => {
        const profilePath = path.join(getStoragePath(version), id);
        await fs.remove(profilePath);
        return true;
    });

    // Reset App (Unlink Game Paths OR Full Factory Reset)
    ipcMain.handle('reset-app', async (_event: IpcMainInvokeEvent, fullReset: boolean = false) => {
        if (fullReset) {
            // Delete all profiles from disk
            const retailStorage = getStoragePath('retail');
            const classicStorage = getStoragePath('classic');

            await fs.remove(retailStorage);
            await fs.remove(classicStorage);

            // Clear entire store (paths, window state, profile orders, etc.)
            store.clear();
            return true;
        } else {
            // Just unlink game paths
            store.delete('wowPath');
            store.delete('classicPath');
            return true;
        }
    });

    // Wipe Game Interface (Fresh Start)
    ipcMain.handle('wipe-interface', async (_event: IpcMainInvokeEvent, version: 'retail' | 'classic' = 'retail') => {
        const wowPath = getWowPath(version);
        if (!wowPath) throw new Error('WoW path not set');


        const liveInterface = path.join(wowPath, 'Interface');
        const liveWTF = path.join(wowPath, 'WTF');

        // Delete folders if they exist
        if (await fs.pathExists(liveInterface)) await fs.remove(liveInterface);
        if (await fs.pathExists(liveWTF)) await fs.remove(liveWTF);

        return true;
    });

    // Open Profile Folder
    ipcMain.handle('open-folder', async (_event: IpcMainInvokeEvent, id: string, version: 'retail' | 'classic' = 'retail') => {
        const profilePath = path.join(getStoragePath(version), id);

        if (await fs.pathExists(profilePath)) {
            const error = await shell.openPath(profilePath);
            if (error) {
                throw new Error(error);
            }
            return true;
        }
        return false;
    });

    // Get Profile Addons
    ipcMain.handle('get-profile-addons', async (_event: IpcMainInvokeEvent, id: string, version: 'retail' | 'classic' = 'retail') => {
        const profilePath = path.join(getStoragePath(version), id);
        const addonsPath = path.join(profilePath, 'Interface', 'AddOns');


        try {
            if (!await fs.pathExists(addonsPath)) {
                return [];
            }

            const entries = await fs.readdir(addonsPath, { withFileTypes: true });
            const addonFolders = entries
                .filter(dirent => dirent.isDirectory())
                .filter(dirent => !dirent.name.startsWith('.')); // Filter out hidden folders

            // Load addon database once for fallback lookups
            let addonDb: Record<string, { url: string; source: string }> = {};
            try {
                // In production: extraResources. In dev: source electron/ folder.
                const dbPath = app.isPackaged
                    ? path.join(process.resourcesPath, 'addon-db.json')
                    : path.join(__dirname, '..', 'electron', 'addon-db.json');
                if (fs.existsSync(dbPath)) {
                    addonDb = fs.readJsonSync(dbPath);
                }
            } catch (err) {
                console.error('[Main] Failed to read addon database:', err);
            }

            // Read .toc files to get metadata
            const addonsWithMetadata = await Promise.all(
                addonFolders.map(async (dirent) => {
                    const addonName = dirent.name;
                    const addonPath = path.join(addonsPath, addonName);

                    // Look for .toc file (usually named AddonName.toc)
                    const tocFiles = await fs.readdir(addonPath);
                    const tocFile = tocFiles.find(f => f.endsWith('.toc'));

                    let url = null;
                    let source = null;

                    if (tocFile) {
                        try {
                            const tocPath = path.join(addonPath, tocFile);
                            const tocContent = await fs.readFile(tocPath, 'utf-8');

                            // Extract URL metadata from .toc file
                            // Common patterns: ## X-Website:, ## X-Curse-Project-ID:, ## X-WoWI-ID:, ## X-GitHub:
                            const websiteMatch = tocContent.match(/##\s*X-Website:\s*(.+)/i);
                            const curseMatch = tocContent.match(/##\s*X-Curse-Project-ID:\s*(\d+)/i);
                            const wowiMatch = tocContent.match(/##\s*X-WoWI-ID:\s*(\d+)/i);
                            const githubMatch = tocContent.match(/##\s*X-GitHub:\s*(.+)/i);

                            if (websiteMatch) {
                                let rawUrl = websiteMatch[1].trim();

                                // Clean up markdown-style links if present: [text](link)
                                const mdMatch = rawUrl.match(/\[.*\]\((.*)\)/);
                                if (mdMatch) rawUrl = mdMatch[1].trim();

                                // Ignore if it clearly looks like a local path
                                const looksLikeLocalPath = /^([a-zA-Z]:|\/|\\|\.\.)/.test(rawUrl);

                                if (!looksLikeLocalPath) {
                                    // Ensure url has protocol
                                    const processedUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;

                                    try {
                                        // Final validation check - must have at least one dot in hostname and be http(s)
                                        const urlObj = new URL(processedUrl);
                                        if ((urlObj.protocol === 'http:' || urlObj.protocol === 'https:') && urlObj.hostname.includes('.')) {
                                            url = processedUrl;

                                            // Detect source from URL
                                            if (url.includes('curseforge.com')) {
                                                source = 'curseforge';
                                            } else if (url.includes('wowace.com')) {
                                                source = 'wowace';
                                            } else if (url.includes('wowinterface.com')) {
                                                source = 'wowinterface';
                                            } else if (url.includes('github.com')) {
                                                source = 'github';
                                            } else {
                                                source = 'website';
                                            }
                                        }
                                    } catch (err) {
                                        // Ignore invalid URLs
                                    }
                                }
                            } else if (curseMatch) {
                                url = `https://www.curseforge.com/wow/search?search=${encodeURIComponent(addonName)}`;
                                source = 'curseforge';
                            } else if (wowiMatch) {
                                url = `https://www.wowinterface.com/downloads/info${wowiMatch[1]}`;
                                source = 'wowinterface';
                            } else if (githubMatch) {
                                const github = githubMatch[1].trim();
                                url = github.startsWith('http') ? github : `https://github.com/${github}`;
                                source = 'github';
                            }
                        } catch (err) {
                            // Skip unreadable .toc files
                        }
                    }

                    // Fallback to local database if no URL found
                    if (!url && addonDb[addonName]) {
                        url = addonDb[addonName].url;
                        source = addonDb[addonName].source;
                    }

                    return { name: addonName, url, source };
                })
            );

            const sortedAddons = addonsWithMetadata.sort((a, b) =>
                a.name.toLowerCase().localeCompare(b.name.toLowerCase())
            );

            return sortedAddons;
        } catch (error) {
            throw error;
        }
    });

    // Open URL in default browser
    ipcMain.handle('open-external', async (_event: IpcMainInvokeEvent, url: string) => {
        try {
            await shell.openExternal(url);
            return true;
        } catch {
            return false;
        }
    });
}

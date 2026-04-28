import path from 'path';
import fs from 'fs-extra';
import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import Store from 'electron-store';
import type { IpcMainInvokeEvent } from 'electron';

type Version = 'retail' | 'classic';

const store = new Store();
const isMac = process.platform === 'darwin';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (process.platform === 'win32') {
    try {
        if (require('electron-squirrel-startup')) app.quit();
    } catch {
        // electron-squirrel-startup not available outside Windows installers
    }
}

function createWindow() {
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
                titleBarOverlay: { color: '#09090b', symbolColor: '#ffffff', height: 40 },
            }),
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
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (!isMac) app.quit();
});

// --- helpers ---

const pathKey = (v: Version) => (v === 'classic' ? 'classicPath' : 'wowPath');
const orderKey = (v: Version) => (v === 'classic' ? 'classicOrder' : 'retailOrder');

function getStoragePath(version: Version) {
    const basePath = (store.get('storagePath') as string) || path.join(app.getPath('userData'), 'profiles');
    return path.join(basePath, version);
}

function getWowPath(version: Version) {
    return store.get(pathKey(version)) as string;
}

function expectedExes(version: Version): string[] {
    if (isMac) {
        return version === 'classic'
            ? ['World of Warcraft Classic.app', 'WoWClassic.app']
            : ['World of Warcraft.app', 'Wow.app'];
    }
    return version === 'classic' ? ['WowClassic.exe', 'Wow.exe'] : ['Wow.exe'];
}

async function anyExists(dir: string, names: string[]) {
    for (const name of names) {
        if (await fs.pathExists(path.join(dir, name))) return true;
    }
    return false;
}

async function isValidWowDir(dir: string, version: Version) {
    if (await anyExists(dir, expectedExes(version))) return true;
    // Fallback: accept if Interface + WTF folders exist
    return (await fs.pathExists(path.join(dir, 'Interface'))) && (await fs.pathExists(path.join(dir, 'WTF')));
}

const FOLDERS = ['Interface', 'WTF'] as const;

async function copyLiveTo(wowPath: string, target: string) {
    for (const f of FOLDERS) {
        const src = path.join(wowPath, f);
        if (await fs.pathExists(src)) await fs.copy(src, path.join(target, f));
    }
}

async function moveLiveTo(wowPath: string, target: string) {
    for (const f of FOLDERS) {
        const src = path.join(wowPath, f);
        if (await fs.pathExists(src)) await fs.move(src, path.join(target, f));
    }
}

async function removeLive(wowPath: string) {
    for (const f of FOLDERS) await fs.remove(path.join(wowPath, f));
}

// addon-db: read once, lazily
let addonDbCache: Record<string, { url: string; source: string }> | null = null;
function getAddonDb() {
    if (addonDbCache) return addonDbCache;
    try {
        const dbPath = app.isPackaged
            ? path.join(process.resourcesPath, 'addon-db.json')
            : path.join(__dirname, '..', 'electron', 'addon-db.json');
        addonDbCache = fs.existsSync(dbPath) ? fs.readJsonSync(dbPath) : {};
    } catch (err) {
        console.error('[Main] Failed to read addon database:', err);
        addonDbCache = {};
    }
    return addonDbCache!;
}

function detectSource(url: string): string {
    if (url.includes('curseforge.com')) return 'curseforge';
    if (url.includes('wowace.com')) return 'wowace';
    if (url.includes('wowinterface.com')) return 'wowinterface';
    if (url.includes('github.com')) return 'github';
    return 'website';
}

function parseTocLinks(addonName: string, toc: string): { url: string | null; source: string | null } {
    const websiteMatch = toc.match(/##\s*X-Website:\s*(.+)/i);
    if (websiteMatch) {
        let raw = websiteMatch[1].trim();
        const md = raw.match(/\[.*\]\((.*)\)/);
        if (md) raw = md[1].trim();
        // Skip local-looking paths
        if (!/^([a-zA-Z]:|\/|\\|\.\.)/.test(raw)) {
            const url = raw.startsWith('http') ? raw : `https://${raw}`;
            try {
                const u = new URL(url);
                if ((u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.includes('.')) {
                    return { url, source: detectSource(url) };
                }
            } catch { /* invalid URL */ }
        }
    }
    const curse = toc.match(/##\s*X-Curse-Project-ID:\s*(\d+)/i);
    if (curse) return { url: `https://www.curseforge.com/wow/search?search=${encodeURIComponent(addonName)}`, source: 'curseforge' };

    const wowi = toc.match(/##\s*X-WoWI-ID:\s*(\d+)/i);
    if (wowi) return { url: `https://www.wowinterface.com/downloads/info${wowi[1]}`, source: 'wowinterface' };

    const gh = toc.match(/##\s*X-GitHub:\s*(.+)/i);
    if (gh) {
        const v = gh[1].trim();
        return { url: v.startsWith('http') ? v : `https://github.com/${v}`, source: 'github' };
    }
    return { url: null, source: null };
}

function setupIpcHandlers() {
    // Select WoW Directory
    ipcMain.handle('select-wow-dir', async (_e: IpcMainInvokeEvent, version: Version = 'retail') => {
        const title = `Select World of Warcraft "${version === 'classic' ? '_classic_' : '_retail_'}" Directory`;
        const result = await dialog.showOpenDialog({ properties: ['openDirectory'], title });
        if (result.canceled) return null;

        const selectedPath = result.filePaths[0];
        if (!await isValidWowDir(selectedPath, version)) {
            dialog.showErrorBox(
                'Invalid Directory',
                `The selected folder does not appear to be a valid WoW ${version} directory. Please select the correct ${version === 'classic' ? '_classic_' : '_retail_'} folder.`
            );
            return null;
        }

        store.set(pathKey(version), selectedPath);
        return selectedPath;
    });

    // Scan WoW Directories
    ipcMain.handle('scan-wow-dirs', async (_e: IpcMainInvokeEvent, version: Version = 'retail') => {
        const suffixes = version === 'classic'
            ? ['_classic_', '_classic_era_', '_classic_ptr_']
            : ['_retail_', '_retail_ptr_'];

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
                'E:\\Games\\World of Warcraft',
            ];

        for (const root of commonRoots) {
            for (const suffix of suffixes) {
                const fullPath = path.join(root, suffix);
                if (!await fs.pathExists(fullPath)) continue;

                let valid = await isValidWowDir(fullPath, version);
                if (!valid) {
                    // Last resort: trust matching suffix dir if non-empty
                    try {
                        valid = (await fs.readdir(fullPath)).length > 0;
                    } catch (e) {
                        console.error('Error reading dir during fallback:', e);
                    }
                }

                if (valid) {
                    store.set(pathKey(version), fullPath);
                    return fullPath;
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

    ipcMain.handle('get-store-value', (_e: IpcMainInvokeEvent, key: string) => {
        if (key === 'storagePath') {
            return (store.get('storagePath') as string) || path.join(app.getPath('userData'), 'profiles');
        }
        return store.get(key);
    });

    ipcMain.handle('set-store-value', (_e: IpcMainInvokeEvent, key: string, value: any) => {
        store.set(key, value);
        return true;
    });

    // Get Profiles
    ipcMain.handle('get-profiles', async (_e: IpcMainInvokeEvent, version: Version = 'retail') => {
        const storagePath = getStoragePath(version);
        await fs.ensureDir(storagePath);

        const entries = await fs.readdir(storagePath, { withFileTypes: true });
        const profiles = await Promise.all(
            entries
                .filter(d => d.isDirectory())
                .map(async d => {
                    const stats = await fs.stat(path.join(storagePath, d.name));
                    return { id: d.name, name: d.name, createdAt: stats.birthtime.toISOString() };
                })
        );

        const sorted = profiles.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
        const savedOrder = store.get(orderKey(version)) as string[] | undefined;
        if (!Array.isArray(savedOrder)) return sorted;

        const byId = new Map(sorted.map(p => [p.id, p]));
        const ordered: typeof sorted = [];
        const seen = new Set<string>();
        for (const id of savedOrder) {
            const p = byId.get(id);
            if (p) {
                ordered.push(p);
                seen.add(id);
            }
        }
        const remaining = sorted.filter(p => !seen.has(p.id));
        // New items first, then user-ordered list
        return [...remaining, ...ordered];
    });

    ipcMain.handle('save-profile-order', (_e: IpcMainInvokeEvent, ids: string[], version: Version = 'retail') => {
        store.set(orderKey(version), ids);
        return true;
    });

    // Create Backup
    ipcMain.handle('create-backup', async (_e: IpcMainInvokeEvent, name: string, version: Version = 'retail') => {
        const wowPath = getWowPath(version);
        if (!wowPath) throw new Error('WoW path not set');

        const safeName = name.replace(/[^a-z0-9_\-\s]/gi, '').trim();
        if (!safeName) throw new Error('Invalid name');

        const target = path.join(getStoragePath(version), safeName);
        if (await fs.pathExists(target)) throw new Error('Profile already exists');

        await fs.ensureDir(target);
        await copyLiveTo(wowPath, target);
        return { id: safeName, name: safeName, createdAt: new Date().toISOString() };
    });

    // Update Backup
    ipcMain.handle('update-backup', async (_e: IpcMainInvokeEvent, id: string, version: Version = 'retail') => {
        const wowPath = getWowPath(version);
        if (!wowPath) throw new Error('WoW path not set');

        const profilePath = path.join(getStoragePath(version), id);
        if (!await fs.pathExists(profilePath)) throw new Error('Profile not found');

        for (const f of FOLDERS) await fs.remove(path.join(profilePath, f));
        await copyLiveTo(wowPath, profilePath);

        const stats = await fs.stat(profilePath);
        return { id, name: id, updatedAt: stats.mtime.toISOString() };
    });

    // Restore Backup
    ipcMain.handle('restore-backup', async (_e: IpcMainInvokeEvent, id: string, version: Version = 'retail') => {
        const wowPath = getWowPath(version);
        if (!wowPath) throw new Error('WoW path not set');

        const profilePath = path.join(getStoragePath(version), id);
        if (!await fs.pathExists(profilePath)) throw new Error('Profile not found');

        // Auto-backup current live folders first
        const backupPath = path.join(app.getPath('userData'), 'backups', `auto_${version}_${Date.now()}`);
        await fs.ensureDir(backupPath);
        await moveLiveTo(wowPath, backupPath);

        // Copy profile to live
        for (const f of FOLDERS) {
            const src = path.join(profilePath, f);
            if (await fs.pathExists(src)) await fs.copy(src, path.join(wowPath, f));
        }
        return true;
    });

    ipcMain.handle('delete-backup', async (_e: IpcMainInvokeEvent, id: string, version: Version = 'retail') => {
        await fs.remove(path.join(getStoragePath(version), id));
        return true;
    });

    // Reset App
    ipcMain.handle('reset-app', async (_e: IpcMainInvokeEvent, fullReset: boolean = false) => {
        if (fullReset) {
            await fs.remove(getStoragePath('retail'));
            await fs.remove(getStoragePath('classic'));
            store.clear();
        } else {
            store.delete('wowPath');
            store.delete('classicPath');
        }
        return true;
    });

    // Wipe Game Interface
    ipcMain.handle('wipe-interface', async (_e: IpcMainInvokeEvent, version: Version = 'retail') => {
        const wowPath = getWowPath(version);
        if (!wowPath) throw new Error('WoW path not set');
        await removeLive(wowPath);
        return true;
    });

    // Open Profile Folder
    ipcMain.handle('open-folder', async (_e: IpcMainInvokeEvent, id: string, version: Version = 'retail') => {
        const profilePath = path.join(getStoragePath(version), id);
        if (!await fs.pathExists(profilePath)) return false;
        const error = await shell.openPath(profilePath);
        if (error) throw new Error(error);
        return true;
    });

    // Get Profile Addons
    ipcMain.handle('get-profile-addons', async (_e: IpcMainInvokeEvent, id: string, version: Version = 'retail') => {
        const addonsPath = path.join(getStoragePath(version), id, 'Interface', 'AddOns');
        if (!await fs.pathExists(addonsPath)) return [];

        const entries = await fs.readdir(addonsPath, { withFileTypes: true });
        const folders = entries.filter(d => d.isDirectory() && !d.name.startsWith('.'));
        const addonDb = getAddonDb();

        const addons = await Promise.all(
            folders.map(async d => {
                const addonName = d.name;
                let url: string | null = null;
                let source: string | null = null;

                try {
                    const addonPath = path.join(addonsPath, addonName);
                    const tocFile = (await fs.readdir(addonPath)).find(f => f.endsWith('.toc'));
                    if (tocFile) {
                        const toc = await fs.readFile(path.join(addonPath, tocFile), 'utf-8');
                        ({ url, source } = parseTocLinks(addonName, toc));
                    }
                } catch { /* skip unreadable addons */ }

                if (!url && addonDb[addonName]) {
                    url = addonDb[addonName].url;
                    source = addonDb[addonName].source;
                }
                return { name: addonName, url, source };
            })
        );

        return addons.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    });

    // Open URL in default browser
    ipcMain.handle('open-external', async (_e: IpcMainInvokeEvent, url: string) => {
        try {
            await shell.openExternal(url);
            return true;
        } catch {
            return false;
        }
    });
}

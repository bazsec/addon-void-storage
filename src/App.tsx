import React, { useState, useEffect } from 'react'
import { arrayMove } from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
import { type DragEndEvent } from '@dnd-kit/core';
import { type Profile } from './components/ProfileCard'
import { ProfileView } from './components/ProfileView'
import { Sidebar } from './components/Sidebar'
import { TitleBar } from './components/TitleBar'
import { useToast } from './components/Toast'
import { AddonListModal } from './components/AddonListModal'
import { ConfirmModal, type ConfirmVariant } from './components/ui/ConfirmModal'
import { Card } from './components/ui/Card'
import { Button } from './components/ui/Button'
import { Input } from './components/ui/Input'
import logo from './assets/logo.png'

// ErrorBoundary must be defined outside the App function to avoid being
// recreated on every render, which would destroy its error-catching state.
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-red-500 bg-void-950 h-full overflow-auto">
          <h2 className="text-xl font-bold mb-4">Something went wrong.</h2>
          <pre className="text-xs font-mono bg-black/50 p-4 rounded">{this.state.error?.toString()}</pre>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-900 rounded">Reload App</button>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  /* State */
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [wowPath, setWowPath] = useState<string | null>(null)
  const [classicPath, setClassicPath] = useState<string | null>(null)
  const [storagePath, setStoragePath] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'home' | 'retail' | 'classic' | 'settings' | 'help'>('home')
  const [retailEnabled, setRetailEnabled] = useState(true)
  const [classicEnabled, setClassicEnabled] = useState(true)

  // Create Modal State
  const [showNewInput, setShowNewInput] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Toast notifications
  const { showToast } = useToast()

  // Addon Modal State
  const [addonModalOpen, setAddonModalOpen] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<{ id: string, name: string } | null>(null)

  // Confirmation Modal State
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: ConfirmVariant;
    confirmLabel?: string;
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => { },
    variant: 'warning'
  })

  useEffect(() => {
    init()
  }, [])

  // Reset create-input state when switching tabs
  useEffect(() => {
    setShowNewInput(false)
    setNewProfileName('')

    if (activeTab === 'retail' || activeTab === 'classic') {
      loadProfiles(activeTab)
    }
  }, [activeTab])

  const init = async () => {
    try {
      const [storedWowPath, storedClassicPath, storedStoragePath, storedRetailEnabled, storedClassicEnabled] = await Promise.all([
        window.electron.getStoreValue('wowPath'),
        window.electron.getStoreValue('classicPath'),
        window.electron.getStoreValue('storagePath'),
        window.electron.getStoreValue('retailEnabled'),
        window.electron.getStoreValue('classicEnabled'),
      ])

      setWowPath(storedWowPath)
      setClassicPath(storedClassicPath)
      setStoragePath(storedStoragePath)

      if (storedRetailEnabled !== undefined) setRetailEnabled(storedRetailEnabled)
      if (storedClassicEnabled !== undefined) setClassicEnabled(storedClassicEnabled)

    } catch (error) {
      console.error('Failed to init:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadProfiles = async (version: 'retail' | 'classic') => {
    const list = await window.electron.getProfiles(version)
    setProfiles(list)
  }

  const handleSelectDir = async (version: 'retail' | 'classic') => {
    const path = await window.electron.selectWowDir(version)
    if (path) {
      if (version === 'classic') setClassicPath(path)
      else setWowPath(path)

      if (activeTab === version) loadProfiles(version)
    }
  }

  const handleSelectStorage = async () => {
    const path = await window.electron.selectStorageDir()
    if (path) {
      setStoragePath(path)
      if (activeTab === 'retail' || activeTab === 'classic') loadProfiles(activeTab)
    }
  }

  const handleScan = async (version: 'retail' | 'classic') => {
    setIsLoading(true)
    try {
      const path = await window.electron.scanWowDirs(version)
      if (path) {
        if (version === 'classic') setClassicPath(path)
        else setWowPath(path)
        showToast(`Found WoW ${version} at: ${path}`, 'success')
      } else {
        showToast(`Could not automatically find World of Warcraft ${version}. Please locate it manually.`, 'error')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newProfileName.trim() || (activeTab !== 'retail' && activeTab !== 'classic')) return
    setIsCreating(true)
    try {
      const newProfile = await window.electron.createBackup(newProfileName, activeTab)
      setProfiles([newProfile, ...profiles])
      setNewProfileName('')
      setShowNewInput(false)
    } catch (error) {
      console.error('Create failed:', error)
      showToast('Failed to create backup. Name might be invalid or duplicate.', 'error')
    } finally {
      setIsCreating(false)
    }
  }

  const handleRestore = async (id: string) => {
    if (activeTab !== 'retail' && activeTab !== 'classic') return

    setConfirmState({
      open: true,
      title: 'Restore Profile',
      message: 'This will overwrite your current live Interface and WTF folders. Are you sure?',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, open: false }))
        setIsLoading(true)
        try {
          await window.electron.restoreBackup(id, activeTab)
          showToast('Restore Complete!', 'success')
        } catch (error) {
          console.error('Restore failed:', error)
          showToast('Restore failed.', 'error')
        } finally {
          setIsLoading(false)
        }
      }
    })
  }

  const handleWipeInterface = async () => {
    if (activeTab !== 'retail' && activeTab !== 'classic') return;

    setConfirmState({
      open: true,
      title: 'WIPE CURRENT INTERFACE?',
      message: `This will DELETE your live 'Interface' and 'WTF' folders for ${activeTab}. Ensure you have backed up your current profile first!`,
      variant: 'danger',
      confirmLabel: 'Wipe Everything',
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, open: false }))
        try {
          setIsLoading(true)
          await window.electron.wipeInterface(activeTab)
          showToast('Interface wiped successfully! You can now start fresh.', 'success')
        } catch (err) {
          console.error(err)
          showToast('Failed to wipe interface. Check console.', 'error')
        } finally {
          setIsLoading(false)
        }
      }
    })
  }

  const handleDelete = async (id: string) => {
    if (activeTab !== 'retail' && activeTab !== 'classic') return

    setConfirmState({
      open: true,
      title: 'Delete Snapshot',
      message: 'Deletions are permanent. Are you sure you want to remove this profile?',
      variant: 'danger',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, open: false }))
        try {
          await window.electron.deleteBackup(id, activeTab)
          setProfiles(profiles.filter(p => p.id !== id))
          showToast('Snapshot deleted.', 'success')
        } catch (error) {
          showToast('Failed to delete snapshot.', 'error')
        }
      }
    })
  }

  const handleResetApp = async (fullReset: boolean = false) => {
    if (fullReset) {
      setConfirmState({
        open: true,
        title: 'FACTORY RESET WARNING',
        message: 'This will permanently DELETE ALL your saved profiles and reset the app to default. Your actual game folders will not be touched.',
        variant: 'danger',
        confirmLabel: 'Reset Everything',
        onConfirm: async () => {
          setConfirmState(prev => ({ ...prev, open: false }))
          try {
            await window.electron.resetApp(true);
            window.location.reload();
          } catch (e) {
            showToast('Reset failed.', 'error')
          }
        }
      })
    } else {
      setConfirmState({
        open: true,
        title: 'Unlink Directories',
        message: 'This will unlink your World of Warcraft directories from the app. You will need to select them again.',
        variant: 'warning',
        confirmLabel: 'Unlink',
        onConfirm: async () => {
          setConfirmState(prev => ({ ...prev, open: false }))
          try {
            await window.electron.resetApp(false);
            setWowPath(null);
            setClassicPath(null);
            showToast('Directories unlinked.', 'success')
          } catch (e) {
            showToast('Failed to unlink.', 'error')
          }
        }
      })
    }
  }

  /* Open Folder Handler */
  const handleOpenFolder = async (id: string) => {
    if (activeTab !== 'retail' && activeTab !== 'classic') return;
    try {
      await window.electron.openFolder(id, activeTab);
    } catch (e) {
      console.error("Failed to open folder", e);
    }
  }

  /* View Addons Handler */
  const handleViewAddons = (id: string) => {
    if (activeTab !== 'retail' && activeTab !== 'classic') return;
    const profile = profiles.find(p => p.id === id);
    if (profile) {
      setSelectedProfile({ id: profile.id, name: profile.name });
      setAddonModalOpen(true);
    }
  }

  /* Update Profile Handler */
  const handleUpdate = async (id: string) => {
    if (activeTab !== 'retail' && activeTab !== 'classic') return;
    const profile = profiles.find(p => p.id === id);
    if (!profile) return;

    setConfirmState({
      open: true,
      title: 'UPDATE BACKUP?',
      message: `This will OVERWRITE the "${profile.name}" backup with your current live ${activeTab} settings and addons.`,
      variant: 'info',
      confirmLabel: 'Update',
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, open: false }))
        try {
          setIsLoading(true);
          await window.electron.updateBackup(id, activeTab);
          showToast(`Profile "${profile.name}" updated successfully!`, 'success');

          const updatedProfiles = await window.electron.getProfiles(activeTab);
          setProfiles(updatedProfiles);
        } catch (err) {
          console.error(err);
          showToast('Failed to update profile. Check console.', 'error');
        } finally {
          setIsLoading(false);
        }
      }
    })
  }

  const handleToggleVersion = async (version: 'retail' | 'classic') => {
    if (version === 'retail') {
      const newValue = !retailEnabled
      if (!newValue && !classicEnabled) {
        showToast("At least one version must be enabled.", "error")
        return
      }
      setRetailEnabled(newValue)
      await window.electron.setStoreValue('retailEnabled', newValue)
      if (activeTab === 'retail' && !newValue) setActiveTab('home')
    } else {
      const newValue = !classicEnabled
      if (!newValue && !retailEnabled) {
        showToast("At least one version must be enabled.", "error")
        return
      }
      setClassicEnabled(newValue)
      await window.electron.setStoreValue('classicEnabled', newValue)
      if (activeTab === 'classic' && !newValue) setActiveTab('home')
    }
  }

  /* Drag End Handler */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = profiles.findIndex((item) => item.id === active.id);
    const newIndex = profiles.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(profiles, oldIndex, newIndex);
    setProfiles(newOrder);

    if (activeTab === 'retail' || activeTab === 'classic') {
      window.electron.saveProfileOrder(newOrder.map(p => p.id), activeTab)
        .catch(err => console.error("Failed to save profile order:", err));
    }
  };

  // Determine safe version for addon modal
  const addonModalVersion = (activeTab === 'retail' || activeTab === 'classic') ? activeTab : 'retail';

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-void-950 relative overflow-hidden">
        {/* Drag Region handles window movement even during loading */}
        <div className="fixed top-0 left-0 right-0 h-10 z-50 drag-region" />

        {/* Animated Background Glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-void-accent-500/10 blur-[120px] animate-pulse" />
          <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-void-accent-600/10 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-6 max-w-xs w-full px-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold tracking-tighter text-white">
              <span className="text-void-accent-400">LOADING</span> VOID
            </h1>
            <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">Initializing Systems</p>
          </div>

          <div className="w-full h-1 bg-void-900 rounded-full overflow-hidden border border-void-800/50">
            <motion.div
              className="h-full bg-gradient-to-r from-void-accent-600 to-void-accent-400"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{
                duration: 2.5,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "loop"
              }}
            />
          </div>

          <div className="flex justify-between w-full text-[9px] font-mono text-gray-600 uppercase tracking-tight">
            <span>Scanning WoW</span>
            <span>Est. 0.4s</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="h-screen w-full text-gray-200 flex flex-col overflow-hidden">
        {/* Title Bar - Draggable, Top-most */}
        <TitleBar />

        {/* Background Logo - Fixed to Viewport (Only on Home/Retail/Classic) */}
        {(activeTab === 'retail' || activeTab === 'classic' || activeTab === 'home') && (
          <div className="fixed top-0 right-0 z-0 pointer-events-none select-none opacity-30">
            <img src={logo} alt="" className="w-[500px] h-auto" />
          </div>
        )}

        {/* Body Content - Fills remaining height */}
        <div className="flex-1 flex overflow-hidden relative bg-[url('/noise.png')] bg-repeat opacity-[0.98]">
          {/* Background Art */}
          <div className="absolute left-16 top-0 bottom-0 w-1/2 pointer-events-none select-none z-0 overflow-hidden mix-blend-screen opacity-15">
            <img src="/Ethereal.png" className="w-full h-full object-cover object-left-top mask-image-linear-to-r" alt="" />
          </div>

          <Sidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            retailPath={wowPath}
            classicPath={classicPath}
            retailEnabled={retailEnabled}
            classicEnabled={classicEnabled}
          />

          {/* Main Content Area */}
          <main className="flex-1 p-8 overflow-y-auto bg-transparent relative z-10">

            {/* HOME VIEW */}
            {activeTab === 'home' && (
              <div className="max-w-4xl mr-auto mt-20 space-y-6 animate-in fade-in zoom-in-95 duration-500">
                <h1 className="text-5xl font-bold bg-gradient-to-r from-white to-void-accent-500 bg-clip-text text-transparent pb-2">
                  Addon Void Storage
                </h1>
                <p className="text-xl text-gray-400 max-w-2xl">
                  Manage your World of Warcraft Interface and WTF folders with ease.
                  Switch between multiple configurations instantly.
                </p>
                <div className="flex justify-start gap-4 pt-8">
                  <div className="p-4 bg-void-900/50 rounded-xl border border-void-800">
                    <p className="text-sm font-medium text-void-accent-400 mb-1">Retail Support</p>
                    <p className="text-xs text-gray-500">
                      {wowPath ? '✓ Connected' : 'Not Configured'}
                    </p>
                  </div>
                  <div className="p-4 bg-void-900/50 rounded-xl border border-void-800">
                    <p className="text-sm font-medium text-orange-500 mb-1">Classic Support</p>
                    <p className="text-xs text-gray-500">
                      {classicPath ? '✓ Connected' : 'Not Configured'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* RETAIL VIEW */}
            {activeTab === 'retail' && (
              <ProfileView
                version="retail"
                dirPath={wowPath}
                profiles={profiles}
                setProfiles={setProfiles}
                showNewInput={showNewInput}
                setShowNewInput={setShowNewInput}
                newProfileName={newProfileName}
                setNewProfileName={setNewProfileName}
                isCreating={isCreating}
                onScan={() => handleScan('retail')}
                onSelectDir={() => handleSelectDir('retail')}
                onCreate={handleCreate}
                onRestore={handleRestore}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                onOpenFolder={handleOpenFolder}
                onViewAddons={handleViewAddons}
                onWipeInterface={handleWipeInterface}
                onDragEnd={handleDragEnd}
              />
            )}

            {/* CLASSIC VIEW */}
            {activeTab === 'classic' && (
              <ProfileView
                version="classic"
                dirPath={classicPath}
                profiles={profiles}
                setProfiles={setProfiles}
                showNewInput={showNewInput}
                setShowNewInput={setShowNewInput}
                newProfileName={newProfileName}
                setNewProfileName={setNewProfileName}
                isCreating={isCreating}
                onScan={() => handleScan('classic')}
                onSelectDir={() => handleSelectDir('classic')}
                onCreate={handleCreate}
                onRestore={handleRestore}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                onOpenFolder={handleOpenFolder}
                onViewAddons={handleViewAddons}
                onWipeInterface={handleWipeInterface}
                onDragEnd={handleDragEnd}
              />
            )}

            {activeTab === 'settings' && (
              <div className="max-w-2xl mr-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Settings</h2>
                  <p className="text-gray-400">Configure your Addon Void Storage.</p>
                </div>
                <Card className="bg-void-900/20 border-void-800">
                  <div className="p-6 space-y-6">
                    {/* Retail Path */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Retail WoW Directory</label>
                      <div className="flex gap-2 no-drag">
                        <Input value={wowPath || 'Not Set'} readOnly className="font-mono text-xs bg-void-950" />
                        <Button variant="outline" onClick={() => handleSelectDir('retail')}>Change</Button>
                      </div>
                      <p className="text-xs text-gray-500">Path to your <code>_retail_</code> folder.</p>
                    </div>

                    <div className="h-px bg-void-800" />

                    {/* Classic Path */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Classic WoW Directory</label>
                      <div className="flex gap-2 no-drag">
                        <Input value={classicPath || 'Not Set'} readOnly className="font-mono text-xs bg-void-950" />
                        <Button variant="outline" onClick={() => handleSelectDir('classic')}>Change</Button>
                      </div>
                      <p className="text-xs text-gray-500">Path to your <code>_classic_</code> folder.</p>
                    </div>

                    <div className="h-px bg-void-800" />

                    {/* Version Support Toggles */}
                    <div className="space-y-4">
                      <label className="text-sm font-medium text-gray-300">Enabled Support</label>
                      <div className="grid grid-cols-2 gap-4 no-drag">
                        <button
                          onClick={() => handleToggleVersion('retail')}
                          className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${retailEnabled ? 'bg-void-accent-900/20 border-void-accent-500/50 text-white' : 'bg-void-950 border-void-800 text-gray-500'}`}
                        >
                          <span className="text-sm font-medium">Retail</span>
                          <div className={`w-8 h-4 rounded-full relative transition-colors duration-200 ${retailEnabled ? 'bg-void-accent-500' : 'bg-void-800'}`}>
                            <div className={`absolute top-1 w-2 h-2 rounded-full bg-white transition-all duration-200 ${retailEnabled ? 'right-1' : 'left-1'}`} />
                          </div>
                        </button>
                        <button
                          onClick={() => handleToggleVersion('classic')}
                          className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${classicEnabled ? 'bg-orange-950/20 border-orange-500/50 text-white' : 'bg-void-950 border-void-800 text-gray-500'}`}
                        >
                          <span className="text-sm font-medium">Classic</span>
                          <div className={`w-8 h-4 rounded-full relative transition-colors duration-200 ${classicEnabled ? 'bg-orange-500' : 'bg-void-800'}`}>
                            <div className={`absolute top-1 w-2 h-2 rounded-full bg-white transition-all duration-200 ${classicEnabled ? 'right-1' : 'left-1'}`} />
                          </div>
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">Enable or disable support for specific World of Warcraft versions.</p>
                    </div>

                    <div className="h-px bg-void-800" />

                    {/* Storage Path */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Storage Location</label>
                      <div className="flex gap-2 no-drag">
                        <Input value={storagePath || 'Default (AppData/profiles)'} readOnly className="font-mono text-xs bg-void-950" />
                        <Button variant="outline" onClick={handleSelectStorage}>Change</Button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Where snapshots are saved. Use this to sync with OneDrive/Dropbox.
                      </p>
                    </div>

                    <div className="h-px bg-void-800" />

                    {/* Danger Zone */}
                    <div className="space-y-4 pt-4">
                      <label className="text-sm font-bold text-red-500">Danger Zone</label>

                      {/* Factory Reset */}
                      <div className="p-4 border border-red-600/30 bg-red-950/20 rounded-lg flex justify-between items-center">
                        <div className="text-xs text-gray-400">
                          <strong className="text-red-400">FACTORY RESET</strong><br />
                          Deletes ALL profiles and settings.<br />
                          Cannot be undone.
                        </div>
                        <Button variant="destructive" size="sm" onClick={() => handleResetApp(true)}>
                          Reset Everything
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'help' && (
              <div className="max-w-2xl mr-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Help & Guide</h2>
                  <p className="text-gray-400">How to use Addon Void Storage.</p>
                </div>

                <Card className="bg-void-900/20 border-void-800 p-6 space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-void-accent-400">Warning: Important First Step</h3>
                    <p className="text-gray-300 text-sm">
                      Before saving any profiles, ensure you have <strong>launched the game at least once</strong>.
                      This generates the <code>Interface</code> and <code>WTF</code> folders that we need to backup.
                    </p>
                  </div>
                  <div className="h-px bg-void-800" />
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-void-accent-400">How to Save a Profile</h3>
                    <ul className="list-disc list-inside text-gray-300 text-sm space-y-2">
                      <li>Configure your UI / Addons in-game exactly how you want them.</li>
                      <li>Open this app and select the <strong>Retail</strong> or <strong>Classic</strong> tab.</li>
                      <li>Click "Add New" and give it a name (e.g., "Raid 10.2", "PVP Healer").</li>
                      <li>Your UI is now safe!</li>
                    </ul>
                  </div>
                  <div className="h-px bg-void-800" />
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-void-accent-400">How to Restore</h3>
                    <p className="text-gray-300 text-sm">
                      Simply click "Restore" on any profile card. The app will swap your live game folders with the stored backup.
                    </p>
                  </div>
                </Card>
              </div>
            )}

          </main>
        </div>

        {/* Addon List Modal */}
        {selectedProfile && (
          <AddonListModal
            open={addonModalOpen}
            onClose={() => setAddonModalOpen(false)}
            profileId={selectedProfile.id}
            profileName={selectedProfile.name}
            version={addonModalVersion}
          />
        )}

        {/* Global Confirmation Modal */}
        <ConfirmModal
          open={confirmState.open}
          onClose={() => setConfirmState(prev => ({ ...prev, open: false }))}
          onConfirm={confirmState.onConfirm}
          title={confirmState.title}
          message={confirmState.message}
          variant={confirmState.variant}
          confirmLabel={confirmState.confirmLabel}
        />
      </div>
    </ErrorBoundary>
  )
}

export default App

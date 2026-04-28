import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { SortableProfileCard } from './SortableProfileCard';
import { FolderOpen, Plus, Box, Eraser } from 'lucide-react'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { Input } from './ui/Input'
import { type Profile } from './ProfileCard'

interface ProfileViewProps {
  version: 'retail' | 'classic'
  dirPath: string | null
  profiles: Profile[]
  showNewInput: boolean
  setShowNewInput: (show: boolean) => void
  newProfileName: string
  setNewProfileName: (name: string) => void
  isCreating: boolean
  onScan: () => void
  onSelectDir: () => void
  onCreate: () => void
  onRestore: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string) => void
  onOpenFolder: (id: string) => void
  onViewAddons: (id: string) => void
  onWipeInterface: () => void
  onDragEnd: (event: DragEndEvent) => void
}

const VERSION_META = {
  retail: {
    label: 'Retail',
    dirLabel: '_retail_',
    placeholder: "Name your snapshot (e.g., 'Raid UI')",
    subtitle: 'Manage your Retail Interface and WTF folder backups.',
    titleClass: 'text-white',
    hintClass: 'text-blue-400/70',
    iconClass: 'text-void-accent-500',
    addBtnClass: 'bg-void-accent-600 hover:bg-void-accent-500 shadow-[0_0_15px_rgba(124,58,237,0.3)]',
    detectGlow: 'shadow-[0_0_20px_#7c3aed]',
    folderGlow: 'shadow-[0_0_50px_rgba(124,58,237,0.2)]',
    saveBtnClass: '',
    inputClass: '',
    accentBar: false,
  },
  classic: {
    label: 'Classic',
    dirLabel: '_classic_',
    placeholder: "Name your snapshot (e.g., 'Leveling UI')",
    subtitle: 'Manage your Classic Era & SoD Interface backups.',
    titleClass: 'text-orange-500',
    hintClass: 'text-orange-400/70',
    iconClass: 'text-orange-500',
    addBtnClass: 'bg-orange-600 hover:bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]',
    detectGlow: 'shadow-[0_0_20px_#f97316]',
    folderGlow: 'shadow-[0_0_50px_rgba(249,115,22,0.2)]',
    saveBtnClass: 'bg-orange-600 hover:bg-orange-500',
    inputClass: 'no-drag cursor-text',
    accentBar: true,
  },
} as const

export function ProfileView({
  version,
  dirPath,
  profiles,
  showNewInput,
  setShowNewInput,
  newProfileName,
  setNewProfileName,
  isCreating,
  onScan,
  onSelectDir,
  onCreate,
  onRestore,
  onDelete,
  onUpdate,
  onOpenFolder,
  onViewAddons,
  onWipeInterface,
  onDragEnd,
}: ProfileViewProps) {
  const m = VERSION_META[version]

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (!dirPath) {
    return (
      <div className="max-w-6xl mr-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="h-full flex flex-col items-start justify-start p-12 text-left space-y-6">
          <div className={`p-6 bg-void-900 rounded-full ${m.folderGlow}`}>
            <FolderOpen className={`h-16 w-16 ${m.iconClass}`} />
          </div>
          <div className="max-w-md space-y-2">
            <h1 className="text-3xl font-bold text-white">Select {m.label} Directory</h1>
            <p className="text-gray-400">
              Please locate your World of Warcraft <code>{m.dirLabel}</code> folder.
            </p>
          </div>
          <div className="flex gap-4">
            <Button size="lg" className={`gap-2 ${m.detectGlow}`} onClick={onScan}>
              <span className="text-xl">🔮</span> Auto-Detect
            </Button>
            <Button size="lg" variant="secondary" onClick={onSelectDir} className="gap-2">
              <FolderOpen className="h-5 w-5" />
              Browse Folder
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mr-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="relative z-10 flex flex-col items-start gap-4">
        <div>
          <h2 className={`text-3xl font-bold mb-2 ${m.titleClass}`}>{m.label} Profiles</h2>
          <p className="text-gray-400">{m.subtitle}</p>
          <p className={`text-xs mt-1 ${m.hintClass}`}>
            Ensure you have booted the game at least once before saving profiles.
          </p>
        </div>

        <div className="flex gap-3">
          <Button size="sm" onClick={() => setShowNewInput(true)} className={`gap-2 ${m.addBtnClass}`}>
            <Plus className="h-4 w-4" />
            Add New
          </Button>
          <Button
            variant="destructive"
            onClick={onWipeInterface}
            className="bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-900/50"
            title="Wipe current Interface & WTF folders"
          >
            <Eraser className="h-4 w-4 mr-2" />
            Wipe
          </Button>
        </div>
      </div>

      {showNewInput && (
        <div className="mb-8 p-4 bg-void-900/30 border border-void-800 rounded-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2 relative z-10 no-drag">
          <div className="flex gap-2 max-w-md">
            {m.accentBar && <div className="w-1 bg-orange-500 rounded-full mr-2" />}
            <Input
              placeholder={m.placeholder}
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              autoFocus
              disabled={isCreating}
              onKeyDown={(e) => e.key === 'Enter' && onCreate()}
              className={m.inputClass}
            />
            <Button onClick={onCreate} disabled={isCreating} className={m.saveBtnClass}>
              {isCreating ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="ghost" onClick={() => setShowNewInput(false)} disabled={isCreating}>Cancel</Button>
          </div>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={profiles} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
            {profiles.map(profile => (
              <div className="no-drag" key={profile.id}>
                <SortableProfileCard
                  profile={profile}
                  onRestore={onRestore}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                  onOpenFolder={onOpenFolder}
                  onViewAddons={onViewAddons}
                />
              </div>
            ))}

            {profiles.length === 0 && (
              <Card className="col-span-full border-dashed border-void-800 bg-transparent flex flex-col items-start justify-start p-12 text-gray-600">
                <Box className="h-12 w-12 mb-4 opacity-20" />
                <p>No {version} snapshots found.</p>
              </Card>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

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
  setProfiles: (profiles: Profile[]) => void
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
  const isClassic = version === 'classic'
  const glowColor = isClassic ? 'rgba(249,115,22,0.2)' : 'rgba(124,58,237,0.2)'
  const buttonGlow = isClassic ? 'rgba(249,115,22,0.3)' : 'rgba(124,58,237,0.3)'
  const label = isClassic ? 'Classic' : 'Retail'
  const dirLabel = isClassic ? '_classic_' : '_retail_'
  const placeholder = isClassic ? "Name your snapshot (e.g., 'Leveling UI')" : "Name your snapshot (e.g., 'Raid UI')"
  const subtitle = isClassic ? 'Manage your Classic Era & SoD Interface backups.' : 'Manage your Retail Interface and WTF folder backups.'

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (!dirPath) {
    return (
      <div className="max-w-6xl mr-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="h-full flex flex-col items-start justify-start p-12 text-left space-y-6">
          <div className={`p-6 bg-void-900 rounded-full shadow-[0_0_50px_${glowColor}]`}>
            <FolderOpen className={`h-16 w-16 ${isClassic ? 'text-orange-500' : 'text-void-accent-500'}`} />
          </div>
          <div className="max-w-md space-y-2">
            <h1 className="text-3xl font-bold text-white">Select {label} Directory</h1>
            <p className="text-gray-400">
              Please locate your World of Warcraft <code>{dirLabel}</code> folder.
            </p>
          </div>
          <div className="flex gap-4">
            <Button size="lg" className={`gap-2 shadow-[0_0_20px_${isClassic ? '#f97316' : '#7c3aed'}]`} onClick={onScan}>
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
      {/* Header Section */}
      <div className="relative z-10 flex flex-col items-start gap-4">
        <div>
          <h2 className={`text-3xl font-bold mb-2 ${isClassic ? 'text-orange-500' : 'text-white'}`}>
            {label} Profiles
          </h2>
          <p className="text-gray-400">{subtitle}</p>
          <p className={`text-xs mt-1 ${isClassic ? 'text-orange-400/70' : 'text-blue-400/70'}`}>
            Ensure you have booted the game at least once before saving profiles.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            size="sm"
            onClick={() => setShowNewInput(true)}
            className={`gap-2 ${isClassic ? 'bg-orange-600 hover:bg-orange-500' : 'bg-void-accent-600 hover:bg-void-accent-500'} shadow-[0_0_15px_${buttonGlow}]`}
          >
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

      {/* Create New Input Area */}
      {showNewInput && (
        <div className="mb-8 p-4 bg-void-900/30 border border-void-800 rounded-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2 relative z-10 no-drag">
          <div className="flex gap-2 max-w-md">
            {isClassic && <div className="w-1 bg-orange-500 rounded-full mr-2"></div>}
            <Input
              placeholder={placeholder}
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              autoFocus
              disabled={isCreating}
              onKeyDown={(e) => e.key === 'Enter' && onCreate()}
              className={isClassic ? 'no-drag cursor-text' : ''}
            />
            <Button onClick={onCreate} disabled={isCreating} className={isClassic ? 'bg-orange-600 hover:bg-orange-500' : ''}>
              {isCreating ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="ghost" onClick={() => setShowNewInput(false)} disabled={isCreating}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={profiles} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
            {profiles.map((profile) => (
              <div className="no-drag" key={profile.id}>
                <SortableProfileCard
                  profile={profile}
                  isActive={false}
                  onRestore={onRestore}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                  onOpenFolder={onOpenFolder}
                  onViewAddons={onViewAddons}
                />
              </div>
            ))}

            {/* Empty State */}
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

import { HardDrive, RotateCcw, Trash2, Folder, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/Card'
import { Button } from './ui/Button'
import { motion } from 'framer-motion'

export interface Profile {
    id: string
    name: string
    createdAt: string
    size?: string
}

interface ProfileCardProps {
    profile: Profile
    onRestore: (id: string) => void
    onDelete: (id: string) => void
    onUpdate: (id: string) => void
    onOpenFolder?: (id: string) => void
    onViewAddons?: (id: string) => void
    isActive?: boolean
}

export function ProfileCard({ profile, onRestore, onDelete, onUpdate, onOpenFolder, onViewAddons, isActive }: ProfileCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
        >
            <Card
                className={`card-glass relative overflow-hidden group transition-all duration-300 border-void-accent-600/30 ${onViewAddons ? 'cursor-pointer' : ''} ${isActive ? 'border-void-accent-500 shadow-[0_0_25px_rgba(124,58,237,0.3)]' : 'hover:border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]'}`}
                onClick={() => onViewAddons && onViewAddons(profile.id)}
            >
                {isActive && (
                    <div className="absolute top-0 right-0 p-2">
                        <span className="flex h-2 w-2 rounded-full bg-void-accent-500 shadow-[0_0_10px_#7c3aed]" />
                    </div>
                )}

                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <HardDrive className={`h-5 w-5 ${isActive ? 'text-void-accent-400' : 'text-gray-400'}`} />
                        {profile.name}
                    </CardTitle>
                    <div className="text-xs text-gray-500 font-mono mt-1">
                        {new Date(profile.createdAt).toLocaleDateString()}
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="text-sm text-gray-400">
                        Contains <span className="text-gray-300">Interface</span>, <span className="text-gray-300">WTF</span>
                    </div>
                </CardContent>

                <CardFooter className="gap-2">
                    <Button
                        className="flex-1 gap-2"
                        variant={isActive ? "secondary" : "default"}
                        onClick={(e) => {
                            e.stopPropagation()
                            onRestore(profile.id)
                        }}
                        disabled={isActive}
                    >
                        <RotateCcw className="h-4 w-4" />
                        {isActive ? 'Active' : 'Restore'}
                    </Button>
                    <div className="flex gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-500 hover:text-emerald-400 hover:bg-emerald-950/30"
                            onClick={(e) => {
                                e.stopPropagation()
                                onUpdate(profile.id)
                            }}
                            title="Update with Live Settings"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-500 hover:text-blue-400 hover:bg-blue-950/30"
                            onClick={(e) => {
                                e.stopPropagation()
                                onOpenFolder && onOpenFolder(profile.id)
                            }}
                            title="Open Folder"
                        >
                            <Folder className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-500 hover:text-red-400 hover:bg-red-950/30"
                            onClick={(e) => {
                                e.stopPropagation()
                                onDelete(profile.id)
                            }}
                            title="Delete Snapshot"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </motion.div>
    )
}

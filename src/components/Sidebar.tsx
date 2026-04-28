import { Home, Settings, Swords, Scroll, CircleHelp } from 'lucide-react'
import { cn } from '../lib/utils'
import { Tooltip } from './ui/Tooltip'

export type Tab = 'home' | 'retail' | 'classic' | 'settings' | 'help'

interface SidebarProps {
    activeTab: Tab
    onTabChange: (tab: Tab) => void
    retailPath: string | null
    classicPath: string | null
    retailEnabled: boolean
    classicEnabled: boolean
}

export function Sidebar({ activeTab, onTabChange, retailPath, classicPath, retailEnabled, classicEnabled }: SidebarProps) {
    return (
        <div className="w-16 md:w-20 bg-void-900 border-r border-void-800 flex flex-col items-center py-6 gap-4 z-40 drag-region h-full">
            <div className="flex flex-col gap-4 w-full px-2 no-drag">
                <SidebarItem icon={<Home className="h-5 w-5" />} label="Home" isActive={activeTab === 'home'} onClick={() => onTabChange('home')} />
                {retailEnabled && (
                    <SidebarItem icon={<Swords className="h-5 w-5" />} label="Retail" isActive={activeTab === 'retail'} onClick={() => onTabChange('retail')} />
                )}
                {classicEnabled && (
                    <SidebarItem icon={<Scroll className="h-5 w-5" />} label="Classic" isActive={activeTab === 'classic'} onClick={() => onTabChange('classic')} />
                )}
            </div>

            <div className="flex-1" />

            <div className="flex flex-col gap-4 w-full px-2 no-drag items-center">
                <SidebarItem icon={<CircleHelp className="h-5 w-5" />} label="Help" isActive={activeTab === 'help'} onClick={() => onTabChange('help')} />
                <SidebarItem icon={<Settings className="h-5 w-5" />} label="Settings" isActive={activeTab === 'settings'} onClick={() => onTabChange('settings')} />

                <div className="flex gap-2 justify-center w-full pb-2">
                    {retailEnabled && (
                        <Tooltip content={`Retail: ${retailPath ? 'Connected' : 'Not Set'}`} side="right">
                            <div className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${retailPath ? 'bg-void-accent-500 shadow-[0_0_8px_#8b5cf6]' : 'bg-void-800 border border-void-700'}`} />
                        </Tooltip>
                    )}
                    {classicEnabled && (
                        <Tooltip content={`Classic: ${classicPath ? 'Connected' : 'Not Set'}`} side="right">
                            <div className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${classicPath ? 'bg-orange-500 shadow-[0_0_8px_#f97316]' : 'bg-void-800 border border-void-700'}`} />
                        </Tooltip>
                    )}
                </div>
            </div>
        </div>
    )
}

function SidebarItem({ icon, label, isActive, onClick }: { icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 group relative",
                isActive ? "text-void-accent-400 bg-void-800/50" : "text-gray-500 hover:text-gray-300 hover:bg-void-800/30"
            )}
        >
            {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-void-accent-500 rounded-r-full" />}
            {icon}
            <span className="text-[10px] font-medium mt-1 opacity-0 group-hover:opacity-100 transition-opacity absolute left-full ml-2 bg-void-900 px-2 py-1 rounded border border-void-800 whitespace-nowrap z-50 pointer-events-none">
                {label}
            </span>
        </button>
    )
}

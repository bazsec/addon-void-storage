import { useState, useEffect } from 'react'
import { Modal } from './ui/Modal'
import { Package, Loader2, AlertCircle, ExternalLink } from 'lucide-react'

interface AddonListModalProps {
    open: boolean
    onClose: () => void
    profileId: string
    profileName: string
    version: 'retail' | 'classic'
}

interface Addon {
    name: string
    url: string | null
    source: string | null
}

export function AddonListModal({ open, onClose, profileId, profileName, version }: AddonListModalProps) {
    const [addons, setAddons] = useState<Addon[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        if (open) {
            loadAddons()
        } else {
            // Reset state when modal closes
            setSearchQuery('')
            setError(null)
            setAddons([])
        }
    }, [open, profileId])

    const loadAddons = async () => {
        setLoading(true)
        setError(null)
        setAddons([])
        try {
            const addonList = await window.electron.getProfileAddons(profileId, version)
            setAddons(addonList || [])
        } catch (err) {
            console.error('Failed to load addons:', err)
            const errorMessage = err instanceof Error ? err.message : 'Unknown error'
            setError(`Failed to load addons: ${errorMessage}`)
        } finally {
            setLoading(false)
        }
    }

    const filteredAddons = addons.filter(addon =>
        addon.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const getLinkText = (source: string | null) => {
        switch (source) {
            case 'curseforge': return 'View on CurseForge'
            case 'wowace': return 'View on WowAce'
            case 'wowinterface': return 'View on WoWInterface'
            case 'github': return 'View on GitHub'
            case 'website': return 'View Website'
            default: return 'View Source'
        }
    }

    const getSourceIcon = (source: string | null) => {
        switch (source) {
            case 'curseforge':
            case 'wowace':
                return <img src="/curse_icon.png" alt="CurseForge" className="h-4 w-4 flex-shrink-0" />
            case 'github':
                return <img src="/github_icon.svg" alt="GitHub" className="h-4 w-4 flex-shrink-0" />
            case 'wowinterface':
                return <img src="/WoWInterface.webp" alt="WoWInterface" className="h-4 w-4 flex-shrink-0" />
            case 'website':
                return <img src="/generic_site.png" alt="Website" className="h-4 w-4 flex-shrink-0" />
            default:
                return <Package className="h-4 w-4 text-void-accent-500/50 group-hover:text-void-accent-500 transition-colors flex-shrink-0" />
        }
    }

    return (
        <Modal open={open} onClose={onClose}>
            {/* Header */}
            <div className="p-6 border-b border-void-800">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Package className="h-6 w-6 text-void-accent-500" />
                    {profileName}
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                    {loading ? 'Loading addons...' : `${addons.length} addon${addons.length !== 1 ? 's' : ''} found`}
                </p>
            </div>

            {/* Search Bar */}
            {!loading && !error && addons.length > 0 && (
                <div className="px-6 pt-4 space-y-3">
                    <input
                        type="text"
                        placeholder="Search addons..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 bg-void-950 border border-void-800 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-void-accent-500 transition-colors"
                    />
                    <div className="flex items-start gap-2 px-3 py-2 bg-void-950/30 border border-void-800/50 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-void-accent-500/50 mt-0.5 flex-shrink-0" />
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                            Source links are extracted from addon <span className="text-gray-400">.toc</span> files.
                            If a link is missing or broken, use the <span className="text-gray-400">Search</span> button to find the addon on CurseForge.
                        </p>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {loading && (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <Loader2 className="h-8 w-8 animate-spin mb-3 text-void-accent-500" />
                        <p>Scanning addons...</p>
                    </div>
                )}

                {error && (
                    <div className="flex flex-col items-center justify-center py-12 text-red-400">
                        <AlertCircle className="h-8 w-8 mb-3" />
                        <p>{error}</p>
                    </div>
                )}

                {!loading && !error && addons.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                        <Package className="h-12 w-12 mb-3 opacity-20" />
                        <p>No addons found in this profile</p>
                        <p className="text-sm mt-1">This might be a fresh backup</p>
                    </div>
                )}

                {!loading && !error && addons.length > 0 && (
                    <div className="space-y-1">
                        {filteredAddons.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">No addons match your search</p>
                        ) : (
                            filteredAddons.map((addon, index) => (
                                <div
                                    key={index}
                                    className="px-4 py-2.5 bg-void-950/50 hover:bg-void-800/50 rounded-lg transition-colors border border-transparent hover:border-void-accent-600/30 group"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            {getSourceIcon(addon.source)}
                                            <span className="text-gray-300 font-mono text-sm truncate">{addon.name}</span>
                                        </div>
                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            {addon.url ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        window.electron.openExternal(addon.url!)
                                                    }}
                                                    className="flex items-center gap-1.5 text-xs text-void-accent-400 hover:text-void-accent-300 transition-colors cursor-pointer"
                                                    title="Open source link"
                                                >
                                                    <span>{getLinkText(addon.source)}</span>
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-600 italic">No source link</span>
                                            )}

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    window.electron.openExternal(`https://www.curseforge.com/wow/search?search=${encodeURIComponent(addon.name)}`)
                                                }}
                                                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-void-accent-400 transition-colors cursor-pointer border-l border-void-800 pl-3"
                                                title="Search for this addon on CurseForge"
                                            >
                                                <span>Search</span>
                                                <ExternalLink className="h-3.5 w-3.5 opacity-50" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </Modal>
    )
}

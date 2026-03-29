

export function TitleBar() {
    return (
        <div className="h-10 bg-void-950 flex items-center px-4 gap-3 select-none border-b border-void-800 drag-region w-full z-50 relative">
            {/* Title/Logo Area */}
            <div className="flex items-center gap-2 opacity-80">
                <span className="text-xs font-medium text-gray-400 tracking-wide">Addon Void Storage</span>
            </div>
        </div>
    )
}

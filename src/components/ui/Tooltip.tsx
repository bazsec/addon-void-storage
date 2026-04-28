import { type ReactNode } from 'react'

type Side = 'right' | 'top' | 'bottom' | 'left'

interface TooltipProps {
    children: ReactNode;
    content: string;
    side?: Side;
}

const POSITION: Record<Side, string> = {
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
}

export function Tooltip({ children, content, side = 'right' }: TooltipProps) {
    return (
        <div className="group relative flex items-center justify-center">
            {children}
            <div className={`absolute ${POSITION[side]} px-3 py-1.5 bg-void-900 border border-void-800 rounded-md text-xs font-medium text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-[0_4px_20px_rgba(0,0,0,0.5)]`}>
                {content}
            </div>
        </div>
    );
}

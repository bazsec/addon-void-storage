import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ProfileCard, type Profile } from './ProfileCard';

interface SortableProfileCardProps {
    profile: Profile;
    onRestore: (id: string) => void;
    onDelete: (id: string) => void;
    onUpdate: (id: string) => void;
    onOpenFolder: (id: string) => void;
    onViewAddons: (id: string) => void;
}

export function SortableProfileCard(props: SortableProfileCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.profile.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
            <ProfileCard {...props} />
        </div>
    );
}

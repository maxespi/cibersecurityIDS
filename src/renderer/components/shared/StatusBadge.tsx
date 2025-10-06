// src/renderer/components/shared/StatusBadge.tsx
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatusBadgeProps {
    status: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
    text: string;
    icon?: LucideIcon;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
    status,
    text,
    icon: Icon,
    size = 'md',
    className = ''
}) => {
    const baseClasses = 'inline-flex items-center rounded-full font-medium';

    const statusClasses = {
        success: 'bg-green-100 text-green-800',
        warning: 'bg-yellow-100 text-yellow-800',
        danger: 'bg-red-100 text-red-800',
        info: 'bg-blue-100 text-blue-800',
        neutral: 'bg-gray-100 text-gray-800'
    };

    const sizeClasses = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-2.5 py-0.5 text-sm',
        lg: 'px-3 py-1 text-sm'
    };

    const iconSizes = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-4 h-4'
    };

    const badgeClasses = `
        ${baseClasses}
        ${statusClasses[status]}
        ${sizeClasses[size]}
        ${className}
    `.trim();

    return (
        <span className={badgeClasses}>
            {Icon && (
                <Icon className={`${iconSizes[size]} ${text ? 'mr-1' : ''}`} />
            )}
            {text}
        </span>
    );
};

export default StatusBadge;
// src/renderer/components/shared/LoadingSpinner.tsx
import React from 'react';
import { RefreshCw } from 'lucide-react';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    text?: string;
    className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    text = 'Cargando...',
    className = ''
}) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8'
    };

    return (
        <div className={`flex items-center justify-center space-x-2 ${className}`}>
            <RefreshCw className={`${sizeClasses[size]} animate-spin text-blue-500`} />
            {text && <span className="text-gray-600">{text}</span>}
        </div>
    );
};

export default LoadingSpinner;
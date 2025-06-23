// src/renderer/components/dashboard/StatsCard.tsx
import React from 'react';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: 'green' | 'blue' | 'red' | 'yellow' | 'purple';
    description?: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
}

const StatsCard: React.FC<StatsCardProps> = ({
    title,
    value,
    icon,
    color,
    description,
    trend
}) => {
    const getColorClasses = () => {
        switch (color) {
            case 'green':
                return {
                    bg: 'bg-green-500',
                    text: 'text-green-400',
                    border: 'border-green-400'
                };
            case 'blue':
                return {
                    bg: 'bg-blue-500',
                    text: 'text-blue-400',
                    border: 'border-blue-400'
                };
            case 'red':
                return {
                    bg: 'bg-red-500',
                    text: 'text-red-400',
                    border: 'border-red-400'
                };
            case 'yellow':
                return {
                    bg: 'bg-yellow-500',
                    text: 'text-yellow-400',
                    border: 'border-yellow-400'
                };
            case 'purple':
                return {
                    bg: 'bg-purple-500',
                    text: 'text-purple-400',
                    border: 'border-purple-400'
                };
            default:
                return {
                    bg: 'bg-gray-500',
                    text: 'text-gray-400',
                    border: 'border-gray-400'
                };
        }
    };

    const colorClasses = getColorClasses();

    return (
        <div className="glass-effect rounded-2xl p-6 hover:bg-opacity-15 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
                <div className={`${colorClasses.bg} p-3 rounded-xl`}>
                    <div className="text-white">
                        {icon}
                    </div>
                </div>

                {trend && (
                    <div className={`flex items-center space-x-1 text-sm ${trend.isPositive ? 'text-green-400' : 'text-red-400'
                        }`}>
                        <span>{trend.isPositive ? '↗' : '↘'}</span>
                        <span>{trend.value}%</span>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <h3 className="text-sm font-medium text-white text-opacity-70">
                    {title}
                </h3>

                <div className={`text-2xl font-bold ${colorClasses.text}`}>
                    {value}
                </div>

                {description && (
                    <p className="text-xs text-white text-opacity-50">
                        {description}
                    </p>
                )}
            </div>

            <style jsx>{`
        .glass-effect {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
      `}</style>
        </div>
    );
};

export default StatsCard;
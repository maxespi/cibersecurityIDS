// src/renderer/components/layout/Navigation.tsx
import React from 'react';
import { Code, FileText, Shield, BarChart3, Activity, Terminal, Settings, Home } from 'lucide-react';
import { ActiveView } from '@/renderer/types';

interface NavigationProps {
    activeView: ActiveView;
    onViewChange: (view: ActiveView) => void;
}

interface NavButtonProps {
    icon: React.ReactNode;
    label: string;
    view: ActiveView;
    isActive: boolean;
    onClick: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`
      flex items-center px-6 py-3 rounded-lg font-medium transition-all duration-200
      ${isActive
                ? 'bg-white text-blue-900 shadow-lg transform scale-105'
                : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30 hover:scale-102'
            }
    `}
    >
        <span className="mr-2">{icon}</span>
        {label}
    </button>
);

const Navigation: React.FC<NavigationProps> = ({ activeView, onViewChange }) => {
    const navItems = [
        {
            view: 'dashboard' as ActiveView,
            icon: <Home className="w-4 h-4" />,
            label: 'Dashboard'
        },
        {
            view: 'scripts' as ActiveView,
            icon: <Terminal className="w-4 h-4" />,
            label: 'Scripts'
        },
        {
            view: 'logs' as ActiveView,
            icon: <FileText className="w-4 h-4" />,
            label: 'Logs'
        },
        {
            view: 'firewall' as ActiveView,
            icon: <Shield className="w-4 h-4" />,
            label: 'Firewall'
        },
        {
            view: 'whitelist' as ActiveView,
            icon: <Settings className="w-4 h-4" />,
            label: 'Whitelist'
        }
    ];

    const handleNavClick = (viewId: ActiveView) => {
        onViewChange(viewId);
    };

    return (
        <nav className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex justify-center space-x-4">
                {navItems.map((item) => (
                    <NavButton
                        key={item.view}
                        icon={item.icon}
                        label={item.label}
                        view={item.view}
                        isActive={activeView === item.view}
                        onClick={() => handleNavClick(item.view)}
                    />
                ))}
            </div>
        </nav>
    );
};

export default React.memo(Navigation);


import React from 'react';
import { ViewType } from '../types';
import { HomeIcon, PlusCircleIcon, CalendarIcon, DumbbellIcon, SparklesIcon } from './icons';

interface BottomNavProps {
    currentView: ViewType;
    setView: (view: ViewType) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setView }) => {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <HomeIcon /> },
        { id: 'ai_creator', label: 'AI Creator', icon: <SparklesIcon /> },
        { id: 'log', label: 'Log WOD', icon: <PlusCircleIcon /> },
        { id: 'history', label: 'History', icon: <CalendarIcon /> },
        { id: 'maxes', label: '1-Rep Max', icon: <DumbbellIcon /> },
        
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-secondary border-t border-gray-700 flex justify-around">
            {navItems.map(item => (
                <button
                    key={item.id}
                    onClick={() => setView(item.id as ViewType)}
                    className={`flex flex-col items-center justify-center p-3 text-center w-full transition-colors ${currentView === item.id ? 'text-accent' : 'text-text-dark hover:text-text-light'}`}
                >
                    {React.cloneElement(item.icon, { className: 'w-6 h-6 mb-1' })}
                    <span className="text-xs">{item.label}</span>
                </button>
            ))}
        </nav>
    );
};

export default BottomNav;

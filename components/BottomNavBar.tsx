
import React from 'react';
import { View, UserTier } from '../types';

interface BottomNavBarProps {
    currentView: View;
    onNavigate: (view: View) => void;
    userTier: UserTier;
}

interface NavItemProps {
    label: string;
    icon: string;
    isActive: boolean;
    onClick: () => void;
    isLocked?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ label, icon, isActive, onClick, isLocked = false }) => {
    const activeClass = 'text-sky-500 font-bold';
    const inactiveClass = 'text-slate-500 hover:text-sky-500';

    return (
        <button
            onClick={onClick}
            className={`flex flex-1 flex-col items-center transition-colors pt-1 pb-1 ${isActive ? activeClass : inactiveClass}`}
            aria-label={label}
        >
            <div className="relative">
                <i className={`fa ${icon} text-2xl`}></i>
                {isLocked && (
                    <div className="absolute -top-1 -right-2 bg-amber-400 text-slate-800 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white" title="Premium Feature">
                        <i className="fa-solid fa-lock" style={{ fontSize: '8px' }}></i>
                    </div>
                )}
            </div>
            <span className="text-xs font-medium mt-1">{label}</span>
        </button>
    );
};

const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentView, onNavigate, userTier }) => {
    const isPremium = userTier === UserTier.Premium;

    const handleCalendarClick = () => {
        if (isPremium) {
            onNavigate(View.Calendar);
        } else {
            onNavigate(View.Paywall);
        }
    };
    
    return (
        <footer className="sticky bottom-0 bg-white/95 backdrop-blur-sm p-2 border-t border-slate-200 shadow-t-lg">
            <nav className="flex justify-around items-center">
                <NavItem
                    label="Home"
                    icon="fa-home"
                    isActive={currentView === View.Dashboard}
                    onClick={() => onNavigate(View.Dashboard)}
                />
                <NavItem
                    label="Library"
                    icon="fa-solid fa-book"
                    isActive={currentView === View.ResourceLibrary}
                    onClick={() => onNavigate(View.ResourceLibrary)}
                />
                <NavItem
                    label="Calendar"
                    icon="fa-calendar-days"
                    isActive={currentView === View.Calendar}
                    onClick={handleCalendarClick}
                    isLocked={!isPremium}
                />
                <NavItem
                    label="Settings"
                    icon="fa-cog"
                    isActive={currentView === View.Settings}
                    onClick={() => onNavigate(View.Settings)}
                />
            </nav>
        </footer>
    );
};

export default BottomNavBar;

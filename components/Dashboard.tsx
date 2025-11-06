import React from 'react';
import { Session, UserTier } from '../types';

interface DashboardProps {
    onStartPractice: () => void;
    userTier: UserTier;
    sessions: Session[];
    remainingFreeSessions: number | null;
}

const Dashboard: React.FC<DashboardProps> = ({ onStartPractice, userTier, sessions, remainingFreeSessions }) => {
    // Calculate remaining sessions from prop if available, otherwise fallback to local calculation
    const displayRemaining = remainingFreeSessions !== null 
        ? remainingFreeSessions 
        : (() => {
            const freeSessionsThisMonth = sessions.filter(s => {
                const sessionDate = new Date(s.date);
                const now = new Date();
                return s.tier === UserTier.Free && sessionDate.getMonth() === now.getMonth() && sessionDate.getFullYear() === now.getFullYear();
            }).length;
            return Math.max(0, 3 - freeSessionsThisMonth);
        })();

    return (
        <div className="flex flex-col items-center justify-center text-center p-4 h-full">
            <div className="mb-8">
                <svg width="84" height="64" viewBox="0 0 84 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M57.75 4C67.2721 4 75 11.7279 75 21.25V31.5C75 41.0221 67.2721 48.75 57.75 48.75H42V21.25C42 11.7279 49.7279 4 59.25 4H57.75Z" stroke="#0ea5e9" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M26.25 60C16.7279 60 9 52.2721 9 42.75V32.5C9 22.9779 16.7279 15.25 26.25 15.25H42V42.75C42 52.2721 34.2721 60 24.75 60H26.25Z" stroke="#22c55e" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="42" cy="32" r="9" fill="#f59e0b"/>
                </svg>
            </div>
            
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome Back!</h1>
            <p className="text-slate-600 mb-12">Ready to sharpen your MI skills?</p>

            <div className="flex flex-col gap-4 w-full max-w-sm">
                <button 
                    onClick={onStartPractice}
                    className="bg-sky-500 text-white font-bold py-3 px-6 rounded-2xl shadow-lg hover:bg-sky-600 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-sky-300"
                >
                    <span className="block text-lg">Start a New Practice</span>
                    {userTier === UserTier.Free && (
                        <span className="block text-sm font-semibold text-yellow-300 mt-1">{displayRemaining} Practices Remaining</span>
                    )}
                </button>
            </div>
        </div>
    );
};

export default Dashboard;
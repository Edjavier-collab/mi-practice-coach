

import React, { useState } from 'react';
import { Session, UserTier } from '../types';
import FeedbackView from './FeedbackView';

interface HistoryViewProps {
    sessions: Session[];
    onBack: () => void;
    onNavigateToPaywall: () => void;
    userTier: UserTier;
}

const HistoryView: React.FC<HistoryViewProps> = ({ sessions, onBack, onNavigateToPaywall, userTier }) => {
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);

    if (selectedSession) {
        return <FeedbackView session={selectedSession} onDone={() => setSelectedSession(null)} onUpgrade={onNavigateToPaywall} />;
    }

    const sortedSessions = sessions.slice().reverse();

    return (
        <div className="p-4 sm:p-6 bg-slate-50 min-h-full">
            <header className="flex items-center mb-6 pt-2">
                 <button onClick={onBack} className="p-2 -ml-2 mr-2 rounded-full hover:bg-slate-200 transition-colors">
                    <i className="fa fa-arrow-left text-xl text-gray-600"></i>
                </button>
                <h1 className="text-2xl font-bold text-gray-800">Session History</h1>
            </header>
            
            {sortedSessions.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-gray-500">You haven't completed any sessions yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {sortedSessions.map(session => (
                        <div key={session.id} onClick={() => setSelectedSession(session)} className="bg-white p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 hover:shadow-md transition-all">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-lg text-blue-700">{session.patient.name}, {session.patient.age}</p>
                                    <p className="text-sm text-gray-600">{session.patient.topic}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-gray-800">{new Date(session.date).toLocaleDateString()}</p>
                                    <p className="text-xs text-gray-500">{new Date(session.date).toLocaleTimeString()}</p>
                                    {session.tier === UserTier.Premium && (
                                        <span className="mt-1 inline-block bg-yellow-200 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded-full">
                                            Premium
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HistoryView;

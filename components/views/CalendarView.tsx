
import React, { useState } from 'react';
import { Session, UserTier } from '../../types';
import FeedbackView from './FeedbackView';

interface CalendarViewProps {
    sessions: Session[];
    onBack: () => void;
    userTier: UserTier;
    onGenerateCoachingSummary: () => void;
    isGeneratingSummary: boolean;
    hasCoachingSummary: boolean;
}

const CalendarView: React.FC<CalendarViewProps> = ({ sessions, onBack, userTier, onGenerateCoachingSummary, isGeneratingSummary, hasCoachingSummary }) => {
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);

    const isPremium = userTier === UserTier.Premium;

    const handleGenerateClick = () => {
        if (!isPremium) {
            onGenerateCoachingSummary(); // This will navigate to the paywall via App.tsx
            return;
        }
        
        const premiumSessions = sessions.filter(s => s.tier === UserTier.Premium && s.feedback.constructiveFeedback);
        if (premiumSessions.length === 0 && !hasCoachingSummary) {
             alert("You need to complete at least one Premium session to generate a summary.");
             return;
        }
        
        onGenerateCoachingSummary();
    };

    if (selectedSession) {
        return (
            <FeedbackView
                session={selectedSession}
                onDone={() => setSelectedSession(null)}
                onUpgrade={() => {}} // This view doesn't trigger upgrades
            />
        );
    }

    // Sort sessions by date, most recent first
    const sortedSessions = [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="flex-grow p-4 sm:p-6 bg-slate-50 min-h-full">
            <header className="flex items-center mb-6 pt-2">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 mr-2 rounded-full hover:bg-slate-200 transition-colors"
                    aria-label="Go back"
                >
                    <i className="fa fa-arrow-left text-xl text-gray-600" aria-hidden="true"></i>
                </button>
                <h1 className="text-2xl font-bold text-gray-800">My Calendar</h1>
            </header>
            
            <main>
                {sortedSessions.length === 0 ? (
                    <div className="text-center py-16">
                        <i className="fa-regular fa-calendar-times text-6xl text-slate-300 mb-6"></i>
                        <h2 className="text-xl font-bold text-slate-700">No Sessions Yet</h2>
                        <p className="text-slate-500 mt-2 max-w-sm mx-auto">
                            Your completed practice sessions will appear here once you finish one.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sortedSessions.map(session => (
                            <div 
                                key={session.id} 
                                onClick={() => setSelectedSession(session)} 
                                className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 cursor-pointer hover:bg-gray-50 hover:shadow-md transition-all duration-200"
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-sky-600 text-lg">
                                            {new Date(session.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                        </p>
                                        <p className="text-sm text-gray-600 mt-1 capitalize">
                                            {`${session.patient.age} y/o ${session.patient.sex.toLowerCase()}, ${session.patient.topic}, ${session.patient.stageOfChange}`}
                                        </p>
                                    </div>
                                    <i className="fa fa-chevron-right text-gray-400" aria-hidden="true"></i>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Progress Report Section */}
            <div className="mt-8 pt-6 border-t border-gray-200">
                 <button
                    onClick={handleGenerateClick}
                    disabled={isGeneratingSummary || (isPremium && !hasCoachingSummary && sessions.filter(s => s.tier === UserTier.Premium).length === 0)}
                    className={`w-full flex items-center justify-center gap-3 text-white font-bold py-4 px-6 rounded-full text-lg shadow-lg transition-all transform ${
                        isPremium 
                        ? 'bg-green-600 hover:bg-green-700 hover:scale-105 disabled:bg-green-300 disabled:cursor-not-allowed' 
                        : 'bg-slate-400'
                    }`}
                >
                    {isGeneratingSummary ? (
                        <>
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Generating Summary...</span>
                        </>
                    ) : (
                        <>
                            <i className={`fa-solid ${hasCoachingSummary ? 'fa-eye' : (isPremium ? 'fa-wand-magic-sparkles' : 'fa-lock')}`}></i>
                            <span>{hasCoachingSummary ? 'View Coaching Summary' : 'Generate Coaching Summary'}</span>
                        </>
                    )}
                </button>
                {!isPremium && (
                     <p className="text-center text-sm text-slate-600 mt-2">
                        Upgrade to Premium to unlock your AI-powered Coaching Summary.
                    </p>
                )}
                {(isPremium && sessions.filter(s => s.tier === UserTier.Premium).length === 0 && sessions.length > 0) && (
                     <p className="text-center text-sm text-slate-600 mt-2">
                        Complete a premium session to generate your first summary.
                    </p>
                )}
            </div>
        </div>
    );
};

export default CalendarView;
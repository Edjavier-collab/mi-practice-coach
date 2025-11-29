import React from 'react';
import { Session, UserTier } from '../../types';

interface FeedbackViewProps {
    session: Session;
    onDone: () => void;
    onUpgrade: () => void;
    onStartPractice?: () => void;
}

const EmpathyGauge: React.FC<{ score: number }> = ({ score }) => {
    const percentage = (score / 5) * 100;
    const circumference = 2 * Math.PI * 45; // 2 * pi * radius
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative w-32 h-32">
            <svg className="w-full h-full" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                    className="text-slate-200"
                    strokeWidth="10"
                    stroke="currentColor"
                    fill="transparent"
                    r="45"
                    cx="50"
                    cy="50"
                />
                {/* Progress circle */}
                <circle
                    className="text-sky-500"
                    strokeWidth="10"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="45"
                    cx="50"
                    cy="50"
                    style={{
                        strokeDasharray: circumference,
                        strokeDashoffset: strokeDashoffset,
                        transform: 'rotate(-90deg)',
                        transformOrigin: '50% 50%',
                        transition: 'stroke-dashoffset 0.8s ease-out'
                    }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-slate-800">{score}</span>
                <span className="text-sm font-medium text-slate-500">/ 5</span>
            </div>
        </div>
    );
};

const MASTER_SKILL_LIST = [
    'Open Questions', 
    'Affirmations', 
    'Reflections', 
    'Summaries', 
    'Developing Discrepancy', 
    'Eliciting Change Talk',
    'Rolling with Resistance',
    'Supporting Self-Efficacy'
];

const SkillsChecklist: React.FC<{ skillsUsed: string[] }> = ({ skillsUsed }) => (
    <div>
        <h3 className="text-lg font-bold text-slate-700 mb-3">MI Skills Checklist</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {MASTER_SKILL_LIST.map(skill => {
                const wasUsed = skillsUsed.includes(skill);
                return (
                    <div key={skill} className={`flex items-center transition-colors duration-300 ${wasUsed ? 'text-slate-800' : 'text-slate-400'}`}>
                        <i className={`fa-solid ${wasUsed ? 'fa-check-square text-green-500' : 'fa-square'} mr-3 text-lg`}></i>
                        <span className="font-medium">{skill}</span>
                    </div>
                );
            })}
        </div>
    </div>
);

const FeedbackSectionCard: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-slate-700 mb-3 flex items-center">
            <i className={`fa-solid ${icon} mr-3 text-sky-500`}></i>
            {title}
        </h3>
        <p className="text-gray-700 leading-relaxed pl-8 whitespace-pre-wrap">{children}</p>
    </div>
);

const FeedbackView: React.FC<FeedbackViewProps> = ({ session, onDone, onUpgrade, onStartPractice }) => {
    const { feedback, tier } = session;
    const isInsufficientData = feedback.analysisStatus === 'insufficient-data';
    const insufficientMessage = feedback.analysisMessage ?? "We didn’t capture any clinician responses during this session, so there isn’t enough information to generate feedback. Try another session when you’re ready to practice.";
    
    if (isInsufficientData) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-full max-w-md bg-white rounded-3xl shadow-lg p-8 border border-gray-100">
                    <div className="mb-6 flex justify-center">
                        <div className="h-20 w-20 rounded-full bg-yellow-100 flex items-center justify-center">
                            <i className="fa-solid fa-circle-exclamation text-4xl text-yellow-500"></i>
                        </div>
                    </div>
                    <h1 className="text-2xl font-extrabold text-gray-900 mb-3">Not Enough Data</h1>
                    <p className="text-gray-600 leading-relaxed">{insufficientMessage}</p>
                    <div className="mt-8 space-y-3">
                        {tier === UserTier.Free && (
                            <button
                                onClick={onUpgrade}
                                className="w-full flex items-center justify-center gap-3 bg-sky-500 text-white font-bold py-4 rounded-full shadow-md hover:bg-sky-600 transition-transform transform hover:scale-105"
                            >
                                <i className="fa fa-award text-yellow-300"></i>
                                <span>Upgrade to Premium</span>
                            </button>
                        )}
                        {onStartPractice && (
                            <button
                                onClick={onStartPractice}
                                className="w-full bg-sky-500 text-white font-bold py-3 rounded-full hover:bg-sky-600 transition"
                            >
                                Start a New Practice
                            </button>
                        )}
                        <button
                            onClick={onDone}
                            className="w-full bg-gray-100 text-gray-700 font-semibold py-3 rounded-full hover:bg-gray-200 transition"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    
    if (tier === UserTier.Free) {
        return (
            <div className="flex flex-col items-center text-center w-full max-w-sm mx-auto py-2">
                <header className="relative w-full flex justify-center items-center mb-6">
                    <button
                        onClick={onDone}
                        className="absolute left-0 text-2xl text-gray-400 hover:text-gray-700 transition-colors"
                        aria-label="Close and return to dashboard"
                    >
                        <i className="fa fa-times" aria-hidden="true"></i>
                    </button>
                    <h1 className="text-xl font-bold text-gray-800">Encounter Summary</h1>
                </header>

                <main className="w-full flex-grow">
                    <div className="bg-slate-700 text-white rounded-2xl p-6 w-full text-left mb-8 shadow-lg">
                        <h2 className="text-2xl font-bold mb-3 text-white">What Went Right</h2>
                        <p className="text-slate-200 leading-relaxed">
                            {feedback.whatWentRight}
                        </p>
                    </div>

                    <div className="text-center mb-10 px-4">
                        <p className="text-gray-600 mb-2">Upgrade to unlock your full feedback report, including</p>
                        <p className="font-bold text-teal-500 text-lg">
                            Key Areas for Growth
                            <span className="text-gray-500 font-normal text-base mx-2">&</span>
                            MI Skills Checklist
                        </p>
                    </div>
                </main>

                <footer className="w-full space-y-3">
                    <button onClick={onUpgrade} className="w-full flex items-center justify-center gap-3 bg-sky-500 text-white font-bold py-4 rounded-full shadow-md hover:bg-sky-600 transition-transform transform hover:scale-105">
                        <i className="fa fa-award text-yellow-300"></i>
                        <span>Upgrade to Premium</span>
                    </button>
                    <button onClick={onDone} className="w-full bg-sky-100 text-sky-600 font-bold py-4 rounded-full hover:bg-sky-200 transition">
                        Done
                    </button>
                </footer>
            </div>
        );
    }

    // New Premium View
    return (
        <div className="bg-slate-50">
             <div className="p-4 sm:p-6 max-w-2xl mx-auto">
                <header className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                        <button
                            onClick={onDone}
                            className="p-2 -ml-2 mr-2 rounded-full hover:bg-slate-200 transition-colors"
                            aria-label="Go back"
                        >
                            <i className="fa fa-arrow-left text-xl text-gray-600" aria-hidden="true"></i>
                        </button>
                        <h1 className="text-2xl font-bold text-gray-800">Encounter Summary</h1>
                    </div>
                </header>
                
                {/* At a Glance Section */}
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6 animate-slide-fade-in">
                    <div className="flex justify-center mb-6 text-center">
                        <div className="flex flex-col items-center">
                            <h3 className="text-lg font-bold text-slate-700 mb-2">Empathy Score</h3>
                            <EmpathyGauge score={feedback.empathyScore ?? 0} />
                        </div>
                    </div>
                    <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-lg font-bold text-slate-700 mb-2 flex items-center">
                             <i className="fa-solid fa-star text-yellow-400 mr-2"></i>
                             Key Takeaway
                        </h3>
                        <p className="text-gray-700 text-lg leading-relaxed pl-8">
                            "{feedback.keyTakeaway ?? 'Great job completing the session!'}"
                        </p>
                    </div>
                </section>

                <main className="space-y-4 mb-6">
                    <FeedbackSectionCard title="What Went Right" icon="fa-thumbs-up">
                        {feedback.whatWentRight}
                    </FeedbackSectionCard>
                    
                    {feedback.constructiveFeedback && (
                        <FeedbackSectionCard title="Constructive Feedback" icon="fa-seedling">
                           {feedback.constructiveFeedback}
                        </FeedbackSectionCard>
                    )}
                </main>

                <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
                    <SkillsChecklist skillsUsed={feedback.keySkillsUsed ?? []} />
                </section>

                {feedback.nextPracticeFocus && (
                    <section className="bg-sky-700 text-white rounded-2xl p-6 shadow-lg mb-6 text-center">
                        <i className="fa-solid fa-bullseye text-3xl mb-3"></i>
                        <h3 className="text-xl font-bold mb-2">Your Next Practice Focus</h3>
                        <p className="text-sky-100 text-lg">
                           {feedback.nextPracticeFocus}
                        </p>
                    </section>
                )}

                <footer className="mt-4 pb-4">
                    <button 
                        onClick={onStartPractice}
                        className="w-full bg-sky-500 text-white font-bold py-4 px-6 rounded-full text-lg shadow-lg hover:bg-sky-600 transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-sky-300"
                    >
                        Start a New Practice
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default FeedbackView;
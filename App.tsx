
import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Fix: Import ChatMessage type to resolve type error in handleFinishPractice.
import { UserTier, View, PatientProfile, Session, Feedback, ChatMessage, StageOfChange, PatientProfileFilters, DifficultyLevel, CoachingSummary } from './types';
import { generatePatientProfile } from './services/patientService';
import { generateCoachingSummary } from './services/geminiService';
import { PATIENT_PROFILE_TEMPLATES, STAGE_DESCRIPTIONS } from './constants';
import Dashboard from './components/Dashboard';
import PracticeView from './components/PracticeView';
import FeedbackView from './components/FeedbackView';
import HistoryView from './components/HistoryView';
import ResourceLibrary from './components/ResourceLibrary';
import Onboarding from './components/Onboarding';
import PaywallView from './components/PaywallView';
import SettingsView from './components/SettingsView';
import BottomNavBar from './components/BottomNavBar';
import CalendarView from './components/CalendarView';
import LoginView from './components/LoginView';
import ForgotPasswordView from './components/ForgotPasswordView';
import CoachingSummaryView from './components/CoachingSummaryView';
import ReviewPrompt from './components/ReviewPrompt';

// New component for premium users to select a practice scenario.
interface ScenarioSelectionViewProps {
    onBack: () => void;
    onStartPractice: (filters: PatientProfileFilters) => void;
}

const DIFFICULTY_DESCRIPTIONS: Record<DifficultyLevel, string> = {
    [DifficultyLevel.Beginner]: "Patient is generally collaborative and open to the idea of change (e.g., Preparation, Action stages).",
    [DifficultyLevel.Intermediate]: "Patient is ambivalent, weighing the pros and cons of changing their behavior (Contemplation stage).",
    [DifficultyLevel.Advanced]: "Patient does not yet see their behavior as a problem and may be resistant to discussing change (Precontemplation stage).",
};

const ScenarioSelectionView: React.FC<ScenarioSelectionViewProps> = ({ onBack, onStartPractice }) => {
    const [selectedTopic, setSelectedTopic] = useState('any');
    const [selectedStage, setSelectedStage] = useState('any');
    const [selectedDifficulty, setSelectedDifficulty] = useState('any');

    // Memoize the list of unique topics from the constants file
    const uniqueTopics = useMemo(() => {
        const topics = new Set(PATIENT_PROFILE_TEMPLATES.map(t => t.topic));
        return Array.from(topics).sort();
    }, []);
    
    const allStages = Object.values(StageOfChange);
    const allDifficulties = Object.values(DifficultyLevel);

    const handleStart = () => {
        const filters: PatientProfileFilters = {};
        if (selectedTopic !== 'any') {
            filters.topic = selectedTopic;
        }
        if (selectedStage !== 'any') {
            filters.stageOfChange = selectedStage as StageOfChange;
        } else if (selectedDifficulty !== 'any') {
            // Only apply difficulty if a specific stage isn't chosen
            filters.difficulty = selectedDifficulty as DifficultyLevel;
        }
        onStartPractice(filters);
    };
    
    const handleRandomStart = () => {
        onStartPractice({});
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
            <header className="flex items-center mb-6 pt-2 max-w-2xl mx-auto">
                <button onClick={onBack} className="p-2 -ml-2 mr-2 rounded-full hover:bg-slate-200 transition-colors">
                    <i className="fa fa-arrow-left text-xl text-gray-600"></i>
                </button>
                <h1 className="text-2xl font-bold text-gray-800">Choose a Scenario</h1>
            </header>

            <main className="max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-6">
                    <div>
                        <label htmlFor="topic-select" className="block text-lg font-semibold text-gray-800 mb-2">
                            <i className="fa-solid fa-list-check mr-2 text-sky-600"></i>
                            Topic of Conversation
                        </label>
                        <select
                            id="topic-select"
                            value={selectedTopic}
                            onChange={(e) => setSelectedTopic(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                            <option value="any">Any Topic</option>
                            {uniqueTopics.map(topic => (
                                <option key={topic} value={topic}>{topic}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="difficulty-select" className="block text-lg font-semibold text-gray-800 mb-2">
                             <i className="fa-solid fa-gauge-high mr-2 text-sky-600"></i>
                            Difficulty Level
                        </label>
                        <select
                            id="difficulty-select"
                            value={selectedDifficulty}
                            onChange={(e) => setSelectedDifficulty(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                            <option value="any">Any Difficulty</option>
                            {allDifficulties.map(level => (
                                <option key={level} value={level}>{level}</option>
                            ))}
                        </select>
                         {selectedDifficulty !== 'any' && (
                             <p className="text-sm text-gray-600 mt-2 pl-1">{DIFFICULTY_DESCRIPTIONS[selectedDifficulty as DifficultyLevel]}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="stage-select" className="block text-lg font-semibold text-gray-800 mb-2">
                             <i className="fa-solid fa-stairs mr-2 text-sky-600"></i>
                            Stage of Change (Optional)
                        </label>
                        <select
                            id="stage-select"
                            value={selectedStage}
                            onChange={(e) => setSelectedStage(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                            <option value="any">Any Stage</option>
                            {allStages.map(stage => (
                                <option key={stage} value={stage}>{stage}</option>
                            ))}
                        </select>
                        {selectedStage !== 'any' && (
                             <p className="text-sm text-gray-600 mt-2 pl-1">{STAGE_DESCRIPTIONS[selectedStage as StageOfChange]}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-2 pl-1">Selecting a specific stage will override the difficulty setting.</p>
                    </div>
                </div>

                <div className="mt-8 space-y-4">
                     <button
                        onClick={handleStart}
                        className="w-full bg-sky-500 text-white font-bold py-4 px-6 rounded-full text-lg shadow-lg hover:bg-sky-600 transition-transform transform hover:scale-105"
                    >
                        Start Selected Scenario
                    </button>
                     <button
                        onClick={handleRandomStart}
                        className="w-full bg-slate-600 text-white font-bold py-3 px-6 rounded-full text-md hover:bg-slate-700 transition"
                    >
                        <i className="fa-solid fa-shuffle mr-2"></i>
                        Start a Random Scenario
                    </button>
                </div>
            </main>
        </div>
    );
};

const App: React.FC = () => {
  const [userTier, setUserTier] = useState<UserTier>(UserTier.Free);
  const [view, setView] = useState<View>(View.Login);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentPatient, setCurrentPatient] = useState<PatientProfile | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [coachingSummary, setCoachingSummary] = useState<CoachingSummary | null>(null);
  const [coachingSummaryError, setCoachingSummaryError] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);

  // Load user tier and session history from localStorage when the app starts.
  useEffect(() => {
    // Check if onboarding has been completed.
    const onboardingComplete = localStorage.getItem('mi-coach-onboarding-complete');
    setShowOnboarding(onboardingComplete !== 'true');

    // Load saved sessions.
    const savedSessions = localStorage.getItem('mi-coach-sessions');
    if (savedSessions) {
      try {
        setSessions(JSON.parse(savedSessions));
// FIX: The original catch block was missing curly braces, causing a major parsing error
// that broke the scope of the entire App component. This resulted in a cascade of "Cannot find name"
// errors for all state variables and setters. Adding the `{` and `}` for the catch block resolves all these issues.
      } catch (error) {
        console.error("Failed to parse sessions from localStorage.", error);
        // If data is corrupted, clear it.
        localStorage.removeItem('mi-coach-sessions');
      }
    }

    // Load saved user tier.
    const savedTier = localStorage.getItem('mi-coach-tier') as UserTier;
    if (savedTier && Object.values(UserTier).includes(savedTier)) {
      setUserTier(savedTier);
    }
  }, []); // Empty dependency array ensures this runs only once on mount.

  const handleOnboardingFinish = () => {
    localStorage.setItem('mi-coach-onboarding-complete', 'true');
    setShowOnboarding(false);
    setView(View.Login);
  };

  // A function to save sessions to state and localStorage.
  const saveSessions = useCallback((updatedSessions: Session[]) => {
    setSessions(updatedSessions);
    localStorage.setItem('mi-coach-sessions', JSON.stringify(updatedSessions));
  }, []);

  const handleStartPractice = () => {
    const freeSessionsThisMonth = sessions.filter(s => {
      const sessionDate = new Date(s.date);
      const now = new Date();
      return s.tier === UserTier.Free && sessionDate.getMonth() === now.getMonth() && sessionDate.getFullYear() === now.getFullYear();
    }).length;

    if (userTier === UserTier.Free && freeSessionsThisMonth >= 3) {
      setView(View.Paywall);
      return;
    }
    
    if (userTier === UserTier.Premium) {
      setView(View.ScenarioSelection);
    } else {
      const patient = generatePatientProfile();
      setCurrentPatient(patient);
      setView(View.Practice);
    }
  };
  
  const handleStartFilteredPractice = (filters: PatientProfileFilters) => {
    const patient = generatePatientProfile(filters);
    setCurrentPatient(patient);
    setView(View.Practice);
  };

  // Save the new session to localStorage when practice is finished.
  const handleFinishPractice = (transcript: ChatMessage[], feedback: Feedback) => {
    if (currentPatient) {
      const newSession: Session = {
        id: new Date().toISOString(),
        date: new Date().toISOString(),
        patient: currentPatient,
        transcript,
        feedback,
        tier: userTier,
      };
      
      const updatedSessions = [...sessions, newSession];
      saveSessions(updatedSessions);
      localStorage.setItem('mi-coach-session-count', updatedSessions.length.toString());

      setCurrentSession(newSession);
      setCoachingSummary(null); // Invalidate old summary
      setCoachingSummaryError(null);
      setView(View.Feedback);
    }
  };
  
  const handleDoneFromFeedback = () => {
    const sessionCount = parseInt(localStorage.getItem('mi-coach-session-count') || '0', 10);
    const reviewDismissed = localStorage.getItem('mi-coach-review-dismissed') === 'true';
    const remindAfterCount = parseInt(localStorage.getItem('mi-coach-review-remind-after') || '0', 10);

    if (!reviewDismissed && sessionCount >= 3 && sessionCount >= remindAfterCount) {
        setShowReviewPrompt(true);
    } else {
        setView(View.Dashboard);
    }
  };
  
  const handleReviewPromptClose = (choice: 'rate' | 'later' | 'no') => {
    setShowReviewPrompt(false);
    
    if (choice === 'rate' || choice === 'no') {
        localStorage.setItem('mi-coach-review-dismissed', 'true');
        if (choice === 'rate') {
             // In a real app, you'd link to the store.
             alert("Thank you for your feedback! You will now be redirected to the app store.");
        }
    } else if (choice === 'later') {
        const sessionCount = parseInt(localStorage.getItem('mi-coach-session-count') || '0', 10);
        // Remind again after 3 more sessions
        localStorage.setItem('mi-coach-review-remind-after', (sessionCount + 3).toString());
    }
    
    setView(View.Dashboard);
  };

  const handleGenerateCoachingSummary = async () => {
        if (coachingSummary && !isGeneratingSummary) {
            setView(View.CoachingSummary);
            return;
        }

        if (userTier !== UserTier.Premium) {
            setView(View.Paywall);
            return;
        }
        
        setCoachingSummaryError(null);
        setIsGeneratingSummary(true);
        setView(View.CoachingSummary);

        try {
            const premiumSessions = sessions.filter(s => s.tier === UserTier.Premium && s.feedback.constructiveFeedback);
            if (premiumSessions.length === 0) {
                 setCoachingSummaryError("You need to complete at least one Premium session to generate a summary.");
                 setIsGeneratingSummary(false);
                 return;
            }
            const reportObject = await generateCoachingSummary(premiumSessions);
            setCoachingSummary(reportObject);
        } catch (error) {
            console.error("Failed to generate coaching summary:", error);
            const errorMessage = error instanceof Error ? error.message : "Sorry, we couldn't generate your summary at this time. Please try again later.";
            setCoachingSummaryError(errorMessage);
        } finally {
            setIsGeneratingSummary(false);
        }
    };

  const handleNavigate = (targetView: View) => setView(targetView);

  const handleLogout = () => {
    // In a real app, this would clear authentication tokens.
    // For this app, we'll just navigate back to the login screen.
    setView(View.Login);
  };

  // Save the new user tier to localStorage upon upgrade.
  const handleUpgrade = () => {
    const newTier = UserTier.Premium;
    setUserTier(newTier);
    localStorage.setItem('mi-coach-tier', newTier);
    setView(View.Dashboard); // Go back to dashboard after upgrading
  };
  
  const renderView = () => {
    switch (view) {
      case View.Login:
        return <LoginView onLogin={() => setView(View.Dashboard)} onNavigate={handleNavigate} />;
      case View.ForgotPassword:
        return <ForgotPasswordView onBack={() => setView(View.Login)} />;
      case View.ScenarioSelection:
        return <ScenarioSelectionView onBack={() => setView(View.Dashboard)} onStartPractice={handleStartFilteredPractice} />;
      case View.Practice:
        return currentPatient && <PracticeView patient={currentPatient} userTier={userTier} onFinish={handleFinishPractice} />;
      case View.Feedback:
        return currentSession && <FeedbackView session={currentSession} onDone={handleDoneFromFeedback} onUpgrade={() => setView(View.Paywall)} onStartPractice={handleStartPractice} />;
      case View.History:
        return <HistoryView sessions={sessions} onBack={() => setView(View.Dashboard)} onNavigateToPaywall={() => setView(View.Paywall)} userTier={userTier} />;
      case View.ResourceLibrary:
        return <ResourceLibrary 
                  onBack={() => setView(View.Dashboard)}
                  onUpgrade={() => setView(View.Paywall)} 
                  userTier={userTier}
                />;
      case View.Paywall:
        // For simplicity, 'onBack' from paywall always returns to dashboard.
        // A more complex implementation could use a 'previousView' state.
        return <PaywallView onBack={() => setView(View.Dashboard)} onUpgrade={handleUpgrade} />;
      case View.Calendar:
        return <CalendarView 
                  sessions={sessions} 
                  onBack={() => setView(View.Dashboard)}
                  userTier={userTier}
                  onGenerateCoachingSummary={handleGenerateCoachingSummary}
                  isGeneratingSummary={isGeneratingSummary}
                  hasCoachingSummary={!!coachingSummary}
                />;
      case View.Settings:
        return <SettingsView 
                  userTier={userTier} 
                  onNavigateToPaywall={() => setView(View.Paywall)}
                  onLogout={handleLogout}
                />;
      case View.CoachingSummary:
        return <CoachingSummaryView
                  isLoading={isGeneratingSummary}
                  summary={coachingSummary}
                  error={coachingSummaryError}
                  onBack={() => setView(View.Calendar)}
                />;
      case View.Dashboard:
      default:
        return (
          <Dashboard 
            onStartPractice={handleStartPractice} 
            userTier={userTier} 
            sessions={sessions}
          />
        );
    }
  };

  if (showOnboarding === null) {
    return <div className="min-h-screen bg-gray-50"></div>; // Or a loading spinner
  }

  if (showOnboarding) {
    return <Onboarding onFinish={handleOnboardingFinish} />;
  }

  const viewsWithNavBar = [View.Dashboard, View.ResourceLibrary, View.Settings, View.Calendar];
  const isPremiumFeedback = view === View.Feedback && userTier === UserTier.Premium;
  const shouldShowNavBar = viewsWithNavBar.includes(view) || isPremiumFeedback;


  return (
    <div className="min-h-screen bg-slate-50 text-gray-800">
      {shouldShowNavBar ? (
          <div className="flex flex-col" style={{ height: '100vh' }}>
              <main className="flex-1 overflow-y-auto pb-20">
                  {renderView()}
              </main>
              <BottomNavBar currentView={view} onNavigate={handleNavigate} userTier={userTier} />
          </div>
      ) : (
          // Views without the main nav bar (e.g., practice, feedback, paywall)
          // These components manage their own full-screen layout.
          renderView()
      )}
      {showReviewPrompt && (
          <ReviewPrompt onClose={handleReviewPromptClose} />
      )}
    </div>
  );
};

export default App;

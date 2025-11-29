import React, { Suspense, lazy } from 'react';
import { View, UserTier, Session, PatientProfile, CoachingSummary, PatientProfileFilters } from '../../types';
import { User } from '@supabase/supabase-js';
import { PageLoader } from '../ui/LoadingSpinner';
import { ScenarioSelectionView } from './ScenarioSelectionView';

// Lazy-loaded view components for code splitting
const Dashboard = lazy(() => import('./Dashboard'));
const PracticeView = lazy(() => import('./PracticeView'));
const FeedbackView = lazy(() => import('./FeedbackView'));
const HistoryView = lazy(() => import('./HistoryView'));
const ResourceLibrary = lazy(() => import('./ResourceLibrary'));
const PaywallView = lazy(() => import('./PaywallView'));
const SettingsView = lazy(() => import('./SettingsView'));
const CancelSubscriptionView = lazy(() => import('./CancelSubscriptionView'));
const CalendarView = lazy(() => import('./CalendarView'));
const LoginView = lazy(() => import('./LoginView'));
const ForgotPasswordView = lazy(() => import('./ForgotPasswordView'));
const ResetPasswordView = lazy(() => import('./ResetPasswordView'));
const EmailConfirmationView = lazy(() => import('./EmailConfirmationView'));
const CoachingSummaryView = lazy(() => import('./CoachingSummaryView'));
const SupportView = lazy(() => import('./SupportView'));

// Lazy-loaded legal pages
const PrivacyPolicy = lazy(() => import('../legal/PrivacyPolicy'));
const TermsOfService = lazy(() => import('../legal/TermsOfService'));
const SubscriptionTerms = lazy(() => import('../legal/SubscriptionTerms'));
const CookiePolicy = lazy(() => import('../legal/CookiePolicy'));
const Disclaimer = lazy(() => import('../legal/Disclaimer'));

interface ViewRendererProps {
  view: View;
  userTier: UserTier;
  user: User | null;
  sessions: Session[];
  remainingFreeSessions: number | null;
  currentPatient: PatientProfile | null;
  currentSession: Session | null;
  coachingSummary: CoachingSummary | null;
  coachingSummaryError: string | null;
  isGeneratingSummary: boolean;
  confirmationEmail: string;
  onNavigate: (view: View) => void;
  onStartPractice: () => void;
  onStartFilteredPractice: (filters: PatientProfileFilters) => void;
  onFinishPractice: (transcript: any[], feedback: any) => void;
  onDoneFromFeedback: () => void;
  onUpgrade: () => void;
  onLogout: () => Promise<void>;
  onGenerateCoachingSummary: () => void;
  onEmailConfirmation: (email: string) => void;
  onTierUpdated: () => Promise<void>;
}

export const ViewRenderer: React.FC<ViewRendererProps> = ({
  view,
  userTier,
  user,
  sessions,
  remainingFreeSessions,
  currentPatient,
  currentSession,
  coachingSummary,
  coachingSummaryError,
  isGeneratingSummary,
  confirmationEmail,
  onNavigate,
  onStartPractice,
  onStartFilteredPractice,
  onFinishPractice,
  onDoneFromFeedback,
  onUpgrade,
  onLogout,
  onGenerateCoachingSummary,
  onEmailConfirmation,
  onTierUpdated,
}) => {
  const renderView = () => {
    switch (view) {
      case View.Login:
        return (
          <LoginView 
            onLogin={() => {}} 
            onNavigate={onNavigate} 
            onEmailConfirmation={onEmailConfirmation}
            onContinueAsGuest={() => onNavigate(View.Dashboard)}
          />
        );
      case View.ForgotPassword:
        return <ForgotPasswordView onBack={() => onNavigate(View.Login)} />;
      case View.EmailConfirmation:
        return (
          <EmailConfirmationView 
            email={confirmationEmail}
            onBack={() => onNavigate(View.Login)} 
            onNavigate={onNavigate}
          />
        );
      case View.ResetPassword:
        return (
          <ResetPasswordView 
            onBack={() => {
              window.history.replaceState({}, '', window.location.pathname);
              onNavigate(View.Login);
            }} 
            onSuccess={() => {
              alert('Password reset successful! Please log in with your new password.');
              window.history.replaceState({}, '', window.location.pathname);
              onNavigate(View.Login);
            }}
          />
        );
      case View.ScenarioSelection:
        return <ScenarioSelectionView onBack={() => onNavigate(View.Dashboard)} onStartPractice={onStartFilteredPractice} />;
      case View.Practice:
        return currentPatient && <PracticeView patient={currentPatient} userTier={userTier} onFinish={onFinishPractice} />;
      case View.Feedback:
        return currentSession && (
          <FeedbackView 
            session={currentSession} 
            onDone={onDoneFromFeedback} 
            onUpgrade={() => onNavigate(View.Paywall)} 
            onStartPractice={onStartPractice} 
          />
        );
      case View.History:
        return (
          <HistoryView 
            sessions={sessions} 
            onBack={() => onNavigate(View.Dashboard)} 
            onNavigateToPaywall={() => onNavigate(View.Paywall)} 
            userTier={userTier} 
          />
        );
      case View.ResourceLibrary:
        return (
          <ResourceLibrary 
            onBack={() => onNavigate(View.Dashboard)}
            onUpgrade={() => onNavigate(View.Paywall)} 
            userTier={userTier}
          />
        );
      case View.Paywall:
        return (
          <PaywallView 
            onBack={() => onNavigate(View.Dashboard)} 
            onUpgrade={onUpgrade} 
            user={user}
            onNavigateToLogin={() => onNavigate(View.Login)}
          />
        );
      case View.Calendar:
        return (
          <CalendarView 
            sessions={sessions} 
            onBack={() => onNavigate(View.Dashboard)}
            userTier={userTier}
            onGenerateCoachingSummary={onGenerateCoachingSummary}
            isGeneratingSummary={isGeneratingSummary}
            hasCoachingSummary={!!coachingSummary}
          />
        );
      case View.Settings:
        return (
          <SettingsView 
            userTier={userTier} 
            onNavigateToPaywall={() => onNavigate(View.Paywall)}
            onLogout={onLogout}
            onNavigate={onNavigate}
            user={user}
          />
        );
      case View.CancelSubscription:
        if (!user) {
          // Redirect to login if not authenticated
          onNavigate(View.Login);
          return null;
        }
        return (
          <CancelSubscriptionView 
            user={user}
            userTier={userTier}
            onBack={() => onNavigate(View.Settings)}
            onTierUpdated={onTierUpdated}
          />
        );
      case View.CoachingSummary:
        return (
          <CoachingSummaryView
            isLoading={isGeneratingSummary}
            summary={coachingSummary}
            error={coachingSummaryError}
            onBack={() => onNavigate(View.Calendar)}
          />
        );
      case View.PrivacyPolicy:
        return <PrivacyPolicy onBack={() => onNavigate(View.Settings)} />;
      case View.TermsOfService:
        return <TermsOfService onBack={() => onNavigate(View.Settings)} />;
      case View.SubscriptionTerms:
        return <SubscriptionTerms onBack={() => onNavigate(View.Settings)} />;
      case View.CookiePolicy:
        return <CookiePolicy onBack={() => onNavigate(View.Settings)} />;
      case View.Disclaimer:
        return <Disclaimer onBack={() => onNavigate(View.Settings)} />;
      case View.Support:
        return <SupportView onBack={() => onNavigate(View.Settings)} />;
      case View.Dashboard:
      default:
        return (
          <Dashboard 
            onStartPractice={onStartPractice} 
            userTier={userTier} 
            sessions={sessions}
            remainingFreeSessions={remainingFreeSessions}
            onNavigateToPaywall={() => onNavigate(View.Paywall)}
          />
        );
    }
  };

  return (
    <Suspense fallback={<PageLoader message="Loading..." />}>
      {renderView()}
    </Suspense>
  );
};


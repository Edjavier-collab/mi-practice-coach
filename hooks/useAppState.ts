import { useState } from 'react';
import { UserTier, View, PatientProfile, Session, CoachingSummary } from '../types';

/**
 * Consolidated app state hook
 * Manages all application-level state in one place
 */
export const useAppState = () => {
  const [userTier, setUserTier] = useState<UserTier>(UserTier.Free);
  const [view, setView] = useState<View>(View.Dashboard);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [remainingFreeSessions, setRemainingFreeSessions] = useState<number | null>(null);
  const [currentPatient, setCurrentPatient] = useState<PatientProfile | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [coachingSummary, setCoachingSummary] = useState<CoachingSummary | null>(null);
  const [coachingSummaryError, setCoachingSummaryError] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string>('');
  const [loggingOut, setLoggingOut] = useState(false);

  return {
    // State
    userTier,
    setUserTier,
    view,
    setView,
    sessions,
    setSessions,
    sessionsLoading,
    setSessionsLoading,
    remainingFreeSessions,
    setRemainingFreeSessions,
    currentPatient,
    setCurrentPatient,
    currentSession,
    setCurrentSession,
    showOnboarding,
    setShowOnboarding,
    coachingSummary,
    setCoachingSummary,
    coachingSummaryError,
    setCoachingSummaryError,
    isGeneratingSummary,
    setIsGeneratingSummary,
    showReviewPrompt,
    setShowReviewPrompt,
    confirmationEmail,
    setConfirmationEmail,
    loggingOut,
    setLoggingOut,
  };
};


import { useEffect, useCallback } from 'react';
import { Session, UserTier, ChatMessage, Feedback, PatientProfile } from '../types';
import { saveSession, getUserSessions } from '../services/databaseService';
import { getRemainingFreeSessions, getRemainingFreeSessionsAnonymous } from '../services/subscriptionService';

interface UseSessionManagerOptions {
  user: { id: string } | null;
  authLoading: boolean;
  userTier: UserTier;
  setSessions: (sessions: Session[]) => void;
  setSessionsLoading: (loading: boolean) => void;
  setRemainingFreeSessions: (count: number | null) => void;
}

/**
 * Hook to manage session loading and saving
 * Handles both authenticated (Supabase) and anonymous (localStorage) users
 */
export const useSessionManager = ({
  user,
  authLoading,
  userTier,
  setSessions,
  setSessionsLoading,
  setRemainingFreeSessions,
}: UseSessionManagerOptions) => {
  // Load sessions from Supabase when user is authenticated, or from localStorage for anonymous users
  useEffect(() => {
    if (authLoading) {
      return;
    }

    const loadSessions = async () => {
      setSessionsLoading(true);
      try {
        if (user) {
          // Authenticated user - load from Supabase
          const supabaseSessions = await getUserSessions(user.id);
          setSessions(supabaseSessions);
          
          // Update remaining free sessions if user is on free tier
          if (userTier === UserTier.Free) {
            const remaining = await getRemainingFreeSessions(user.id);
            setRemainingFreeSessions(remaining);
          } else {
            setRemainingFreeSessions(null); // Premium users don't have limits
          }
          
          // If no sessions in Supabase, try to migrate from localStorage (old logged-in sessions)
          if (supabaseSessions.length === 0) {
            const savedSessions = localStorage.getItem('mi-coach-sessions');
            if (savedSessions) {
              try {
                const localSessions = JSON.parse(savedSessions) as Session[];
                // Optionally migrate old sessions to Supabase (could be done in background)
                console.log('[useSessionManager] Found', localSessions.length, 'sessions in localStorage (migration may be needed)');
              } catch (error) {
                console.error("[useSessionManager] Failed to parse sessions from localStorage:", error);
                localStorage.removeItem('mi-coach-sessions');
              }
            }
          }
        } else {
          // Anonymous user - load from localStorage
          const anonymousSessionsJson = localStorage.getItem('mi-coach-anonymous-sessions');
          if (anonymousSessionsJson) {
            try {
              const anonymousSessions = JSON.parse(anonymousSessionsJson) as Session[];
              setSessions(anonymousSessions);
              
              // Calculate remaining free sessions for anonymous user
              if (userTier === UserTier.Free) {
                const remaining = getRemainingFreeSessionsAnonymous();
                setRemainingFreeSessions(remaining);
              } else {
                setRemainingFreeSessions(null);
              }
            } catch (error) {
              console.error("[useSessionManager] Failed to parse anonymous sessions from localStorage:", error);
              localStorage.removeItem('mi-coach-anonymous-sessions');
              setSessions([]);
              setRemainingFreeSessions(3); // Default to 3 remaining if we can't load
            }
          } else {
            // No anonymous sessions yet
            setSessions([]);
            setRemainingFreeSessions(3); // Start with 3 free sessions
          }
        }
      } catch (error) {
        console.error("[useSessionManager] Failed to load sessions:", error);
        // Fallback: try localStorage for anonymous users
        if (!user) {
          try {
            const anonymousSessionsJson = localStorage.getItem('mi-coach-anonymous-sessions');
            if (anonymousSessionsJson) {
              const anonymousSessions = JSON.parse(anonymousSessionsJson) as Session[];
              setSessions(anonymousSessions);
              setRemainingFreeSessions(getRemainingFreeSessionsAnonymous());
            } else {
              setSessions([]);
              setRemainingFreeSessions(3);
            }
          } catch (parseError) {
            console.error("[useSessionManager] Failed to parse anonymous sessions from localStorage:", parseError);
            setSessions([]);
            setRemainingFreeSessions(3);
          }
        } else {
          // For authenticated users, fallback to empty sessions
          setSessions([]);
          setRemainingFreeSessions(userTier === UserTier.Free ? 3 : null);
        }
      } finally {
        setSessionsLoading(false);
      }
    };

    loadSessions();
  }, [user, authLoading, userTier, setSessions, setSessionsLoading, setRemainingFreeSessions]);

  /**
   * Save a new session after practice is finished
   */
  const saveNewSession = useCallback(async (
    transcript: ChatMessage[],
    feedback: Feedback,
    patient: PatientProfile,
    currentSessions: Session[],
    userTier: UserTier
  ): Promise<Session> => {
    const newSession: Session = {
      id: new Date().toISOString(),
      date: new Date().toISOString(),
      patient,
      transcript,
      feedback,
      tier: userTier,
    };

    // Optimistically update local state for immediate UI feedback
    const updatedSessions = [...currentSessions, newSession];
    setSessions(updatedSessions);
    localStorage.setItem('mi-coach-session-count', updatedSessions.length.toString());

    // Save based on whether user is authenticated or anonymous
    if (user) {
      // Authenticated user - save to Supabase
      try {
        await saveSession(newSession, user.id);
        console.log('[useSessionManager] Session saved to Supabase successfully');
        
        // Refresh remaining free sessions if user is on free tier
        if (userTier === UserTier.Free) {
          const remaining = await getRemainingFreeSessions(user.id);
          setRemainingFreeSessions(remaining);
        }
      } catch (error) {
        console.error('[useSessionManager] Failed to save session to Supabase:', error);
        // Session is already in local state, so UI remains functional
      }
    } else {
      // Anonymous user - save to localStorage
      try {
        localStorage.setItem('mi-coach-anonymous-sessions', JSON.stringify(updatedSessions));
        console.log('[useSessionManager] Session saved to localStorage for anonymous user');
        
        // Update remaining free sessions
        if (userTier === UserTier.Free) {
          const remaining = getRemainingFreeSessionsAnonymous();
          setRemainingFreeSessions(remaining);
        }
      } catch (error) {
        console.error('[useSessionManager] Failed to save anonymous session to localStorage:', error);
        // Session is already in local state, so UI remains functional
      }
    }

    return newSession;
  }, [user, setSessions, setRemainingFreeSessions]);

  return {
    saveNewSession,
  };
};


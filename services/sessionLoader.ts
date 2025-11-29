import { Session } from '../types';
import { getUserSessions } from './databaseService';
import { getRemainingFreeSessions, getRemainingFreeSessionsAnonymous } from './subscriptionService';
import { UserTier } from '../types';

/**
 * Service to load sessions for both authenticated and anonymous users
 * Handles the logic for loading from Supabase vs localStorage
 */
export class SessionLoader {
  /**
   * Load sessions for an authenticated user from Supabase
   */
  static async loadAuthenticatedSessions(userId: string, userTier: UserTier): Promise<{
    sessions: Session[];
    remainingFreeSessions: number | null;
  }> {
    try {
      const sessions = await getUserSessions(userId);
      
      // Update remaining free sessions if user is on free tier
      const remainingFreeSessions = userTier === UserTier.Free
        ? await getRemainingFreeSessions(userId)
        : null;

      return { sessions, remainingFreeSessions };
    } catch (error) {
      console.error('[SessionLoader] Failed to load authenticated sessions:', error);
      // Return empty sessions on error
      return {
        sessions: [],
        remainingFreeSessions: userTier === UserTier.Free ? 3 : null,
      };
    }
  }

  /**
   * Load sessions for an anonymous user from localStorage
   */
  static loadAnonymousSessions(userTier: UserTier): {
    sessions: Session[];
    remainingFreeSessions: number | null;
  } {
    try {
      const anonymousSessionsJson = localStorage.getItem('mi-coach-anonymous-sessions');
      
      if (anonymousSessionsJson) {
        const sessions = JSON.parse(anonymousSessionsJson) as Session[];
        const remainingFreeSessions = userTier === UserTier.Free
          ? getRemainingFreeSessionsAnonymous()
          : null;

        return { sessions, remainingFreeSessions };
      } else {
        // No anonymous sessions yet
        return {
          sessions: [],
          remainingFreeSessions: userTier === UserTier.Free ? 3 : null,
        };
      }
    } catch (error) {
      console.error('[SessionLoader] Failed to load anonymous sessions:', error);
      localStorage.removeItem('mi-coach-anonymous-sessions');
      return {
        sessions: [],
        remainingFreeSessions: userTier === UserTier.Free ? 3 : null,
      };
    }
  }

  /**
   * Load sessions based on user authentication state
   */
  static async loadSessions(
    userId: string | null,
    userTier: UserTier
  ): Promise<{
    sessions: Session[];
    remainingFreeSessions: number | null;
  }> {
    if (userId) {
      return this.loadAuthenticatedSessions(userId, userTier);
    } else {
      return this.loadAnonymousSessions(userTier);
    }
  }
}


import { useState, useEffect, useCallback } from 'react';
import { UserTier } from '../types';
import { getUserProfile, createUserProfile } from '../services/databaseService';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook to manage user tier state and updates
 * Handles loading tier from Supabase, localStorage fallback, and tier updates
 */
export const useTierManager = () => {
  const { user, loading: authLoading } = useAuth();
  const [userTier, setUserTier] = useState<UserTier>(UserTier.Free);

  // Load user tier from localStorage when the app starts
  useEffect(() => {
    // For anonymous users, always use Free tier
    // For authenticated users, load from localStorage as fallback (will be overridden by Supabase)
    if (!user) {
      setUserTier(UserTier.Free);
    } else {
      // Authenticated user - load saved tier from localStorage (fallback, will be overridden by Supabase)
      const savedTier = localStorage.getItem('mi-coach-tier') as UserTier;
      if (savedTier && Object.values(UserTier).includes(savedTier)) {
        setUserTier(savedTier);
      }
    }
  }, [user]);

  // Load user tier from Supabase after authentication
  useEffect(() => {
    if (!user || authLoading) {
      return;
    }

    const loadTierFromSupabase = async () => {
      try {
        console.log('[useTierManager] Loading tier from Supabase for user:', user.id);
        const profile = await getUserProfile(user.id);
        
        if (profile && profile.tier) {
          console.log('[useTierManager] Loaded tier from Supabase:', profile.tier);
          setUserTier(profile.tier as UserTier);
          localStorage.setItem('mi-coach-tier', profile.tier);
        } else {
          console.log('[useTierManager] No profile found. Creating new profile with Free tier.');
          // Create a new profile for the user
          const newProfile = await createUserProfile(user.id, UserTier.Free);
          if (newProfile && newProfile.tier) {
            setUserTier(newProfile.tier as UserTier);
            localStorage.setItem('mi-coach-tier', newProfile.tier);
          } else {
            // Fallback to Free tier if creation fails
            setUserTier(UserTier.Free);
            localStorage.setItem('mi-coach-tier', UserTier.Free);
          }
        }
      } catch (error) {
        console.error('[useTierManager] Failed to load tier from Supabase:', error);
        // Fallback to localStorage or Free
        const savedTier = localStorage.getItem('mi-coach-tier') as UserTier;
        if (savedTier && Object.values(UserTier).includes(savedTier)) {
          setUserTier(savedTier);
        } else {
          setUserTier(UserTier.Free);
          localStorage.setItem('mi-coach-tier', UserTier.Free);
        }
      }
    };

    loadTierFromSupabase();
  }, [user, authLoading]);

  /**
   * Update tier and sync to localStorage
   */
  const updateTier = useCallback((newTier: UserTier) => {
    setUserTier(newTier);
    localStorage.setItem('mi-coach-tier', newTier);
  }, []);

  /**
   * Refresh tier from Supabase
   */
  const refreshTier = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      const profile = await getUserProfile(user.id);
      if (profile && profile.tier) {
        updateTier(profile.tier as UserTier);
        return profile.tier as UserTier;
      }
    } catch (error) {
      console.error('[useTierManager] Failed to refresh tier:', error);
    }
    return null;
  }, [user, updateTier]);

  return {
    userTier,
    setUserTier: updateTier,
    refreshTier,
  };
};


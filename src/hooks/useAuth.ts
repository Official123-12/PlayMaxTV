import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchUserProfile } from '@/lib/db';
import { setCurrentUser, isAdmin } from '@/lib/auth';
import type { Session } from '@supabase/supabase-js';

export interface AuthState {
  session: Session | null;
  profile: Record<string, unknown> | null;
  loading: boolean;
  isAdmin: boolean;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (sess: Session) => {
    const p = await fetchUserProfile(sess.user.id);
    setProfile(p);
    // Sync to localStorage for quick reads
    setCurrentUser({
      id: sess.user.id,
      name: (p?.display_name as string) || sess.user.email?.split('@')[0] || 'User',
      email: sess.user.email || '',
      isPremium: (p?.is_premium as boolean) || false,
      premiumPlan: (p?.premium_plan as string) || undefined,
      premiumExpiry: (p?.premium_expiry as string) || undefined,
      watchHistory: [],
      watchlist: [],
    });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) loadProfile(s).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) loadProfile(s);
      else { setProfile(null); setCurrentUser(null); }
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    session,
    profile,
    loading,
    isAdmin: isAdmin(session?.user?.email),
  };
}

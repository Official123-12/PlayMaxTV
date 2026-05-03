import { supabase } from './supabase';
import { ADMIN_EMAILS } from '@/constants';
import type { WatchHistory } from '@/types';

export function isAdmin(email?: string): boolean {
  return ADMIN_EMAILS.includes(email || '');
}

// ─── PlayMax Auth ──────────────────────────────────────────────────────────────

export async function sendOtp(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyOtpAndRegister(
  email: string,
  token: string,
  password: string,
  displayName: string
) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;

  const { data: updated, error: updateError } = await supabase.auth.updateUser({
    password,
    data: { display_name: displayName, full_name: displayName },
  });
  if (updateError) throw updateError;
  return updated.user;
}

export async function verifyOtpAndLogin(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const CURRENT_USER_KEY = 'playmax_current_user';

export interface LocalUser {
  id: string;
  name: string;
  email: string;
  isPremium: boolean;
  premiumPlan?: string;
  premiumExpiry?: string;
  watchHistory: WatchHistory[];
  watchlist: string[];
}

export function getCurrentUser(): LocalUser | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setCurrentUser(user: LocalUser | null) {
  if (user) localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(CURRENT_USER_KEY);
}

export function updateCurrentUser(updates: Partial<LocalUser>): LocalUser | null {
  const user = getCurrentUser();
  if (!user) return null;
  const updated = { ...user, ...updates };
  setCurrentUser(updated);
  return updated;
}

export function logout() {
  localStorage.removeItem(CURRENT_USER_KEY);
  signOut();
}

export function addToWatchlist(subjectId: string): void {
  const user = getCurrentUser();
  if (!user) return;
  if (!user.watchlist.includes(subjectId)) {
    updateCurrentUser({ watchlist: [...user.watchlist, subjectId] });
  }
}

export function removeFromWatchlist(subjectId: string): void {
  const user = getCurrentUser();
  if (!user) return;
  updateCurrentUser({ watchlist: user.watchlist.filter(id => id !== subjectId) });
}

export function isInWatchlist(subjectId: string): boolean {
  const user = getCurrentUser();
  return user?.watchlist.includes(subjectId) || false;
}

export function updateWatchHistory(item: WatchHistory): void {
  const user = getCurrentUser();
  if (!user) return;
  const history = user.watchHistory.filter(h => h.subjectId !== item.subjectId);
  updateCurrentUser({ watchHistory: [item, ...history].slice(0, 50) });
}

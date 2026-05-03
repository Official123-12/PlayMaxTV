import { supabase } from './supabase';
import type { WatchHistory } from '@/types';

// ─── Watch History ────────────────────────────────────────────────────────────

export async function upsertWatchHistory(item: WatchHistory & { userId: string }) {
  const { error } = await supabase
    .from('watch_history')
    .upsert(
      {
        user_id: item.userId,
        subject_id: item.subjectId,
        title: item.title,
        cover: item.cover,
        subject_type: item.subjectType,
        timestamp_sec: item.timestamp,
        duration_sec: item.duration,
        watched_at: item.watchedAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,subject_id' }
    );
  if (error) console.error('upsertWatchHistory:', error.message);
}

export async function fetchWatchHistory(userId: string): Promise<WatchHistory[]> {
  const { data, error } = await supabase
    .from('watch_history')
    .select('*')
    .eq('user_id', userId)
    .order('watched_at', { ascending: false })
    .limit(50);
  if (error) { console.error('fetchWatchHistory:', error.message); return []; }
  return (data || []).map(r => ({
    subjectId: r.subject_id,
    title: r.title,
    cover: r.cover,
    subjectType: r.subject_type,
    timestamp: r.timestamp_sec,
    duration: r.duration_sec,
    watchedAt: r.watched_at,
  }));
}

export async function deleteWatchHistory(userId: string, subjectId: string) {
  await supabase
    .from('watch_history')
    .delete()
    .eq('user_id', userId)
    .eq('subject_id', subjectId);
}

// ─── Watchlist ────────────────────────────────────────────────────────────────

export interface WatchlistItem {
  subjectId: string;
  title: string;
  cover: string;
  subjectType: number;
  addedAt: string;
}

export async function addWatchlistItem(userId: string, item: Omit<WatchlistItem, 'addedAt'>) {
  const { error } = await supabase.from('watchlist').upsert(
    {
      user_id: userId,
      subject_id: item.subjectId,
      title: item.title,
      cover: item.cover,
      subject_type: item.subjectType,
    },
    { onConflict: 'user_id,subject_id' }
  );
  if (error) console.error('addWatchlistItem:', error.message);
}

export async function removeWatchlistItem(userId: string, subjectId: string) {
  await supabase
    .from('watchlist')
    .delete()
    .eq('user_id', userId)
    .eq('subject_id', subjectId);
}

export async function fetchWatchlist(userId: string): Promise<WatchlistItem[]> {
  const { data, error } = await supabase
    .from('watchlist')
    .select('*')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });
  if (error) { console.error('fetchWatchlist:', error.message); return []; }
  return (data || []).map(r => ({
    subjectId: r.subject_id,
    title: r.title,
    cover: r.cover,
    subjectType: r.subject_type,
    addedAt: r.added_at,
  }));
}

export async function isInWatchlistDB(userId: string, subjectId: string): Promise<boolean> {
  const { data } = await supabase
    .from('watchlist')
    .select('id')
    .eq('user_id', userId)
    .eq('subject_id', subjectId)
    .single();
  return !!data;
}

// ─── Payment Proofs ───────────────────────────────────────────────────────────

export interface ProofSubmission {
  plan: string;
  amount: string;
  proofUrl: string;
}

export async function submitProof(userId: string, proof: ProofSubmission) {
  const { error } = await supabase.from('payment_proofs').insert({
    user_id: userId,
    plan: proof.plan,
    amount: proof.amount,
    proof_url: proof.proofUrl,
  });
  if (error) throw error;
}

export async function fetchProofs() {
  const { data, error } = await supabase
    .from('payment_proofs')
    .select(`*, user_profiles(display_name, email)`)
    .order('submitted_at', { ascending: false });
  if (error) { console.error('fetchProofs:', error.message); return []; }
  return data || [];
}

export async function updateProofStatus(proofId: string, status: 'approved' | 'rejected') {
  const { data: proof } = await supabase
    .from('payment_proofs')
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq('id', proofId)
    .select()
    .single();

  if (status === 'approved' && proof) {
    const expiry = new Date();
    if (proof.plan === 'weekly') expiry.setDate(expiry.getDate() + 7);
    else if (proof.plan === 'monthly') expiry.setMonth(expiry.getMonth() + 1);
    else if (proof.plan === 'yearly') expiry.setFullYear(expiry.getFullYear() + 1);

    await supabase
      .from('user_profiles')
      .update({
        is_premium: true,
        premium_plan: proof.plan,
        premium_expiry: expiry.toISOString(),
      })
      .eq('id', proof.user_id);
  }
}

// ─── Upload proof image ───────────────────────────────────────────────────────

export async function uploadProofImage(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('payment-proofs')
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('payment-proofs').getPublicUrl(path);
  return data.publicUrl;
}

// ─── User profile ─────────────────────────────────────────────────────────────

export async function fetchUserProfile(userId: string) {
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data;
}

export async function updateUserProfile(userId: string, updates: Record<string, unknown>) {
  const { error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userId);
  if (error) throw error;
}

export async function fetchAllUsers() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchAllUsers:', error.message); return []; }
  return data || [];
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  userId: string;
  userName: string;
  subjectId: string;
  subjectTitle: string;
  rating: number;
  reviewText: string;
  createdAt: string;
}

export async function fetchReviews(subjectId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, user_profiles(display_name, email)')
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchReviews:', error.message); return []; }
  return (data || []).map(r => ({
    id: r.id,
    userId: r.user_id,
    userName: r.user_profiles?.display_name || r.user_profiles?.email?.split('@')[0] || 'User',
    subjectId: r.subject_id,
    subjectTitle: r.subject_title,
    rating: r.rating,
    reviewText: r.review_text || '',
    createdAt: r.created_at,
  }));
}

export async function upsertReview(userId: string, data: {
  subjectId: string;
  subjectTitle: string;
  rating: number;
  reviewText: string;
}) {
  const { error } = await supabase.from('reviews').upsert(
    {
      user_id: userId,
      subject_id: data.subjectId,
      subject_title: data.subjectTitle,
      rating: data.rating,
      review_text: data.reviewText,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,subject_id' }
  );
  if (error) throw error;
}

export async function deleteReview(userId: string, subjectId: string) {
  await supabase.from('reviews').delete().eq('user_id', userId).eq('subject_id', subjectId);
}

export async function fetchAvgRating(subjectId: string): Promise<{ avg: number; count: number }> {
  const { data } = await supabase
    .from('reviews')
    .select('rating')
    .eq('subject_id', subjectId);
  if (!data || data.length === 0) return { avg: 0, count: 0 };
  const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
  return { avg: Math.round(avg * 10) / 10, count: data.length };
}

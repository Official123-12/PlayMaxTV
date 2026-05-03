import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/layout/Navbar';
import AdBanner from '@/components/features/AdBanner';
import VideoPlayer from '@/components/features/VideoPlayer';
import MovieCard from '@/components/features/MovieCard';
import { fetchEpisodes, searchMovies, fetchShowboxDetail } from '@/lib/api';
import type { SeasonData, Episode } from '@/lib/api';
import type { StreamQuality } from '@/types';
import { updateWatchHistory, isInWatchlist, addToWatchlist, removeFromWatchlist, getCurrentUser } from '@/lib/auth';
import { upsertWatchHistory, fetchReviews, upsertReview, fetchAvgRating, deleteReview } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import type { Review } from '@/lib/db';
import {
  Star, Plus, Check, Download, Share2, Crown, Loader, ArrowLeft,
  Tv, ChevronDown, Play, Timer, MessageSquare, Trash2, Lock, RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// ─── Mid-stream ad overlay ────────────────────────────────────────────────────
function StreamAdOverlay({ onClose }: { onClose: () => void }) {
  const [seconds, setSeconds] = useState(15);
  const [canClose, setCanClose] = useState(false);
  useEffect(() => {
    const t = setInterval(() => {
      setSeconds(p => { if (p <= 1) { clearInterval(t); setCanClose(true); return 0; } return p - 1; });
    }, 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="absolute inset-0 bg-black/95 z-30 flex items-center justify-center rounded-2xl">
      <div className="text-center px-6 py-8 max-w-sm">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#e50914] to-red-800 flex items-center justify-center mb-4">
          <Crown size={26} className="text-[#f5c518]" />
        </div>
        <p className="text-white font-black text-lg mb-1">PlayMax TV</p>
        <p className="text-gray-400 text-sm mb-6">Your streaming destination · Advertisement</p>
        <div className="bg-gray-900 rounded-xl p-3 mb-5 flex items-center justify-between">
          <span className="text-gray-500 text-xs">Go Premium to remove ads</span>
          <span className="flex items-center gap-1.5 text-gray-400 text-xs"><Timer size={11} /> {seconds}s</span>
        </div>
        <Link to="/premium" className="block w-full bg-[#e50914] text-white font-black py-2.5 rounded-xl text-sm mb-3 hover:bg-red-700 transition-colors">
          Get PlayMax+ · Remove Ads
        </Link>
        <button
          onClick={canClose ? onClose : undefined}
          disabled={!canClose}
          className={`text-sm transition-colors ${canClose ? 'text-gray-400 hover:text-white cursor-pointer' : 'text-gray-700 cursor-not-allowed'}`}
        >
          {canClose ? 'Continue watching →' : `Skip in ${seconds}s`}
        </button>
      </div>
    </div>
  );
}

// ─── Auth gate — only shown after loading completes ───────────────────────────
function AuthGate({ title }: { title: string }) {
  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-[#141414] border border-gray-800 flex items-center justify-center mb-5">
          <Lock size={36} className="text-[#e50914]" />
        </div>
        <h1 className="text-white text-2xl font-black mb-2">Sign In to Watch</h1>
        <p className="text-gray-500 text-sm mb-2 leading-relaxed">
          Create a free account to stream <span className="text-white font-semibold">"{title}"</span> and thousands of other movies &amp; shows.
        </p>
        <p className="text-gray-700 text-xs mb-6">Completely free — no credit card required.</p>
        <div className="flex gap-3">
          <Link to="/register" className="flex-1 bg-[#e50914] text-white font-black py-3 rounded-2xl text-sm hover:bg-red-700 transition-colors shadow-lg shadow-red-900/30">
            Join Free
          </Link>
          <Link to="/login" className="flex-1 border border-gray-700 text-gray-300 font-bold py-3 rounded-2xl text-sm hover:border-gray-500 hover:text-white transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Ratings & Reviews ────────────────────────────────────────────────────────
function RatingsSection({ subjectId, subjectTitle }: { subjectId: string; subjectTitle: string }) {
  const { session } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgData, setAvgData] = useState({ avg: 0, count: 0 });
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchReviews(subjectId).then(setReviews);
    fetchAvgRating(subjectId).then(setAvgData);
  }, [subjectId]);

  useEffect(() => {
    if (session?.user?.id) {
      const mine = reviews.find(r => r.userId === session.user.id);
      if (mine) { setUserRating(mine.rating); setReviewText(mine.reviewText); }
    }
  }, [reviews, session?.user?.id]);

  const StarSVG = ({ filled }: { filled: boolean }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? '#f5c518' : 'none'}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        stroke="#f5c518" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const myReview = reviews.find(r => r.userId === session?.user?.id);

  const handleSubmit = async () => {
    if (!session) { toast.error('Sign in to leave a review'); return; }
    if (userRating === 0) { toast.error('Select a star rating'); return; }
    setSubmitting(true);
    try {
      await upsertReview(session.user.id, { subjectId, subjectTitle, rating: userRating, reviewText });
      const [updated, avg] = await Promise.all([fetchReviews(subjectId), fetchAvgRating(subjectId)]);
      setReviews(updated); setAvgData(avg);
      toast.success('Review submitted!'); setShowForm(false);
    } catch { toast.error('Failed to submit review'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!session) return;
    await deleteReview(session.user.id, subjectId);
    const [updated, avg] = await Promise.all([fetchReviews(subjectId), fetchAvgRating(subjectId)]);
    setReviews(updated); setAvgData(avg); setUserRating(0); setReviewText('');
    toast.success('Review deleted');
  };

  return (
    <div className="bg-[#141414] rounded-2xl p-5 border border-gray-800/40">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-white font-black text-base flex items-center gap-2">
          <MessageSquare size={16} className="text-[#e50914]" /> Ratings & Reviews
        </h2>
        {avgData.count > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex">{[1,2,3,4,5].map(s => <StarSVG key={s} filled={s <= Math.round(avgData.avg)} />)}</div>
            <span className="text-[#f5c518] font-black text-sm">{avgData.avg}</span>
            <span className="text-gray-600 text-xs">({avgData.count})</span>
          </div>
        )}
      </div>

      {session && !showForm && (
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-4 py-2.5 rounded-xl transition-all mb-5 font-semibold">
          <Star size={14} className="text-[#f5c518]" /> {myReview ? 'Edit your review' : 'Write a review'}
        </button>
      )}

      {showForm && session && (
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-700/40 mb-5">
          <p className="text-white font-bold text-sm mb-3">Your Rating</p>
          <div className="flex gap-1 mb-3">
            {[1,2,3,4,5].map(s => (
              <button key={s} onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)} onClick={() => setUserRating(s)} className="transition-transform hover:scale-110">
                <svg width="28" height="28" viewBox="0 0 24 24" fill={(hoverRating || userRating) >= s ? '#f5c518' : 'none'}>
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="#f5c518" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
            <span className="text-[#f5c518] text-sm font-black ml-2 self-center">
              {['','Poor','Fair','Good','Great','Excellent'][hoverRating || userRating] || ''}
            </span>
          </div>
          <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Share your thoughts (optional)..." rows={3}
            className="w-full bg-[#111] border border-gray-700/60 text-white text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-[#e50914] resize-none placeholder:text-gray-700" />
          <div className="flex gap-2 mt-3">
            <button onClick={handleSubmit} disabled={submitting || userRating === 0}
              className="flex-1 bg-[#e50914] text-white font-black py-2.5 rounded-xl text-sm hover:bg-red-700 disabled:opacity-40 transition-colors">
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
            {myReview && (
              <button onClick={handleDelete} className="px-4 py-2.5 rounded-xl border border-red-900/50 text-red-500 hover:bg-red-950/30 transition-colors text-sm">
                <Trash2 size={14} />
              </button>
            )}
            <button onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl border border-gray-700 text-gray-500 hover:text-white transition-colors text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="text-gray-700 text-sm italic">No reviews yet. Be the first!</p>
      ) : (
        <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
          {reviews.map(review => (
            <div key={review.id} className="border-b border-gray-800/40 pb-4 last:border-0">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#e50914] to-red-800 flex items-center justify-center text-white text-xs font-black">
                    {review.userName[0]?.toUpperCase()}
                  </div>
                  <span className="text-white text-sm font-semibold">{review.userName}</span>
                </div>
                <div className="flex">{[1,2,3,4,5].map(s => <StarSVG key={s} filled={s <= review.rating} />)}</div>
              </div>
              {review.reviewText && <p className="text-gray-400 text-sm leading-relaxed ml-9">{review.reviewText}</p>}
              <p className="text-gray-700 text-xs ml-9 mt-1">{new Date(review.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── XCASPER bff/stream URL builder ─────────────────────────────────────────
// The XCASPER subjectId is ALL we need — the bff/stream endpoint accepts it directly.
// These URLs serve video bytes in <video src> without any additional proxy.
const SB_BASE = 'https://movieapi.xcasper.space/api';
const OMEGA_BASE = 'https://omegatech-api.dixonomega.tech/api/movie';

function buildXcasperStreams(subjectId: string): StreamQuality[] {
  return [
    { proxyUrl: `${SB_BASE}/bff/stream?subjectId=${subjectId}&resolution=1080`, resolutions: '1080', quality: '1080p HD' },
    { proxyUrl: `${SB_BASE}/bff/stream?subjectId=${subjectId}&resolution=720`,  resolutions: '720',  quality: '720p HD'  },
    { proxyUrl: `${SB_BASE}/bff/stream?subjectId=${subjectId}&resolution=480`,  resolutions: '480',  quality: '480p'     },
    { proxyUrl: `${SB_BASE}/bff/stream?subjectId=${subjectId}&resolution=360`,  resolutions: '360',  quality: '360p'     },
  ];
}

// ─── Stream fetcher — direct client-side build ────────────────────────────────
async function fetchStreamViaEdge(params: {
  title: string;
  type: string;
  season?: number;
  episode?: number;
  id: string;           // XCASPER subjectId
  detailPath?: string;
}): Promise<{ streams: StreamQuality[]; subtitleUrl?: string }> {
  const { id, type, season, episode, title, detailPath } = params;

  // Primary: build streams directly from XCASPER subjectId
  // These URLs are guaranteed to work in <video src> — the API serves video bytes
  const streams = buildXcasperStreams(id);
  console.log('[stream] Built XCASPER streams for subjectId:', id);

  // Try to get subtitle in background (non-blocking)
  let subtitleUrl: string | undefined;
  try {
    // Via edge function (for subtitle fetch with proper headers)
    const { data } = await supabase.functions.invoke('stream-proxy', {
      body: { id, type, season: season || 1, episode: episode || 1, title, detailPath },
    });
    if (data?.subtitleUrl) subtitleUrl = data.subtitleUrl;
    console.log('[stream] Edge function response — subtitleUrl:', subtitleUrl);
  } catch (e) {
    console.warn('[stream] Edge function call failed (non-critical):', e);
  }

  return { streams, subtitleUrl };
}

// ─── Dixon Omega fallback for TV series sources ───────────────────────────────
async function tryOmegaSeriesSources(params: {
  xcasperId: string;
  season: number;
  episode: number;
  detailPath?: string;
}): Promise<StreamQuality[] | null> {
  const { xcasperId, season, episode, detailPath } = params;
  try {
    const path = detailPath || '';
    const url = `${OMEGA_BASE}/moviebox-series-sources?id=${xcasperId}&season=${season}&episode=${episode}&path=${encodeURIComponent(path)}`;
    console.log('[omega] Trying series sources:', url);
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    console.log('[omega] Response:', JSON.stringify(json).slice(0, 400));

    const streams: StreamQuality[] = [];
    const walk = (obj: unknown): void => {
      if (!obj || typeof obj !== 'object') return;
      const o = obj as Record<string, unknown>;
      if (typeof o.url === 'string' && o.url.startsWith('http')) {
        const q = String(o.quality || o.resolution || '480');
        streams.push({ proxyUrl: o.url, resolutions: q.replace(/[^0-9]/g, ''), quality: q });
        return;
      }
      if (Array.isArray(obj)) { obj.forEach(walk); return; }
      Object.values(o).forEach(walk);
    };
    walk(json);
    return streams.length > 0 ? streams : null;
  } catch (e) {
    console.warn('[omega] Error:', e);
    return null;
  }
}

// ─── Main WatchPage ───────────────────────────────────────────────────────────
export default function WatchPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session, profile, loading: authLoading } = useAuth();

  const subjectType = searchParams.get('type') || '1';
  const movieTitle = searchParams.get('title') || 'Unknown Title';
  const movieCover = searchParams.get('cover') || '';
  const isTVShow = subjectType === '2';
  const sbType = isTVShow ? 'tv' : 'movie';

  const [streams, setStreams] = useState<StreamQuality[]>([]);
  const [subtitleUrl, setSubtitleUrl] = useState<string | undefined>();
  const [streamLoading, setStreamLoading] = useState(true);
  const [streamError, setStreamError] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [episodeLoading, setEpisodeLoading] = useState(false);
  const [showEpisodes, setShowEpisodes] = useState(isTVShow);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [inList, setInList] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const adTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ShowBox detail for cast
  const { data: sbDetail } = useQuery({
    queryKey: ['showbox-detail-watch', movieTitle, sbType],
    queryFn: () => fetchShowboxDetail(movieTitle, sbType),
    enabled: !!movieTitle && !authLoading && !!session,
    staleTime: 15 * 60 * 1000,
  });

  const castList = sbDetail?.actors
    ? sbDetail.actors.split(',').map((a: string) => a.trim()).filter(Boolean).slice(0, 16)
    : [];

  const adPremiumExpiry = localStorage.getItem('playmax_ad_premium');
  const hasAdPremium = adPremiumExpiry ? new Date(adPremiumExpiry) > new Date() : false;
  const isPremium = (profile?.is_premium as boolean) || hasAdPremium;

  useEffect(() => { if (id) setInList(isInWatchlist(id)); }, [id]);

  const detailPath = searchParams.get('detailPath') || '';

  // Build stream URLs directly from XCASPER subjectId — no edge function lookup needed
  // The subjectId IS the XCASPER subjectId from trending/browse/search responses.
  // Format: https://movieapi.xcasper.space/api/bff/stream?subjectId=XCASPER_ID&resolution=720
  const loadStream = useCallback(async (
    contentId: string,
    type: string,
    episode?: Episode,
  ) => {
    setStreamLoading(true);
    setStreamError(false);
    setStreams([]);

    const sbType = type === '2' || type === 'tv' ? 'tv' : 'movie';
    console.log('[WatchPage] Loading stream. subjectId:', contentId, 'type:', sbType);

    const { streams: newStreams, subtitleUrl: sub } = await fetchStreamViaEdge({
      title: movieTitle,
      type: sbType,
      season: episode?.season,
      episode: episode?.episode,
      id: contentId,
      detailPath,
    });

    if (newStreams.length > 0) {
      console.log('[WatchPage] ✅ Streams ready:', newStreams.length, 'qualities');
      setStreams(newStreams);
      if (sub) setSubtitleUrl(sub);
    } else {
      console.warn('[WatchPage] ❌ No streams built');
      setStreamError(true);
    }

    setStreamLoading(false);
  }, [movieTitle, detailPath]);

  // Initial load — wait for auth to resolve first
  useEffect(() => {
    if (!id || authLoading) return;
    loadStream(id, subjectType);
  }, [id, subjectType, loadStream, authLoading]);

  // Mid-stream ad (every 20 min for free users)
  useEffect(() => {
    if (isPremium) return;
    adTimerRef.current = setTimeout(() => setShowAd(true), 20 * 60 * 1000);
    return () => { if (adTimerRef.current) clearTimeout(adTimerRef.current); };
  }, [isPremium]);

  // ─── Episodes ─────────────────────────────────────────────────────────────
  const { data: seasonData = [], isLoading: episodesLoading } = useQuery<SeasonData[]>({
    queryKey: ['episodes', id, movieTitle, selectedSeason],
    queryFn: () => fetchEpisodes(id!, movieTitle, selectedSeason),
    enabled: !!id && isTVShow,
    staleTime: 10 * 60 * 1000,
  });

  const currentEpisodes = seasonData.find(s => s.season === selectedSeason)?.episodes
    || seasonData[0]?.episodes || [];

  const handleEpisodePlay = async (episode: Episode) => {
    if (!id) return;
    setSelectedEpisode(episode);
    setEpisodeLoading(true);
    setStreams([]);
    setStreamError(false);

    // For TV episodes, use the XCASPER show ID + season/episode
    // The bff/stream endpoint uses the SHOW's subjectId (not episode-specific)
    const { streams: epStreams, subtitleUrl: sub } = await fetchStreamViaEdge({
      title: movieTitle,
      type: 'tv',
      season: episode.season,
      episode: episode.episode,
      id,
      detailPath,
    });

    if (epStreams.length > 0) {
      setStreams(epStreams);
      if (sub) setSubtitleUrl(sub);
    } else {
      // Omega fallback for TV episodes
      const omegaStreams = await tryOmegaSeriesSources({ xcasperId: id, season: episode.season, episode: episode.episode, detailPath });
      if (omegaStreams && omegaStreams.length > 0) setStreams(omegaStreams);
      else setStreamError(true);
    }
    setEpisodeLoading(false);
  };

  // Related content
  const { data: relatedData } = useQuery({
    queryKey: ['related', movieTitle],
    queryFn: () => searchMovies(movieTitle.split(' ')[0] || 'popular'),
    enabled: !!movieTitle,
    staleTime: 10 * 60 * 1000,
  });
  const related = (relatedData?.items || []).filter(m => m.subjectId !== id).slice(0, 12);

  // subtitleUrl is set by loadStream / handleEpisodePlay
  const startTime = (() => {
    try { return getCurrentUser()?.watchHistory?.find(h => h.subjectId === id)?.timestamp || 0; }
    catch { return 0; }
  })();

  const handleTimeUpdate = useCallback((currentTime: number, duration: number) => {
    if (!id || currentTime < 5) return;
    if (Math.floor(currentTime) % 15 !== 0) return;
    const item = {
      subjectId: id, title: movieTitle, cover: movieCover,
      timestamp: currentTime, duration, watchedAt: new Date().toISOString(),
      subjectType: parseInt(subjectType),
    };
    updateWatchHistory(item);
    if (session?.user?.id) upsertWatchHistory({ ...item, userId: session.user.id });
  }, [id, movieTitle, movieCover, subjectType, session]);

  const handleWatchlist = () => {
    if (!session) { navigate('/login'); return; }
    if (inList) { removeFromWatchlist(id!); setInList(false); toast.success('Removed from watchlist'); }
    else { addToWatchlist(id!); setInList(true); toast.success('Added to watchlist'); }
  };

  const handleShare = () => {
    if (navigator.share) navigator.share({ title: movieTitle, url: window.location.href });
    else { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }
  };

  // ─── Loading state — show spinner while auth resolves ─────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#e50914] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  // ─── Auth gate — only after loading completes ──────────────────────────────
  if (!session) return <AuthGate title={movieTitle} />;
  if (!id) return <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center text-white">Invalid content</div>;

  const activeSubtitle = subtitleUrl || streams[0]?.subtitleUrl;
  const isLoading = streamLoading || episodeLoading;
  const activeStream = streams[0];

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <Navbar />
      <main className="pt-[68px]">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-4 text-sm font-medium">
            <ArrowLeft size={16} /> Back
          </button>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <div className="xl:col-span-3 space-y-5">

              {/* ─── Player ──────────────────────────────────────────────────── */}
              <div className="relative">
                {isLoading ? (
                  <div className="w-full aspect-video bg-gradient-to-br from-gray-900 to-[#111] rounded-2xl flex flex-col items-center justify-center gap-4 border border-gray-800/50">
                    <Loader size={36} className="text-[#e50914] animate-spin" />
                    <p className="text-gray-400 text-sm font-semibold">Preparing stream…</p>
                    <p className="text-gray-700 text-xs">Loading: <span className="text-gray-600 italic">{movieTitle}</span></p>
                  </div>
                ) : streamError ? (
                  <div className="w-full aspect-video bg-gradient-to-br from-gray-900 to-[#111] rounded-2xl flex flex-col items-center justify-center gap-5 border border-gray-800/50">
                    <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="4" width="20" height="14" rx="3" stroke="#374151" strokeWidth="1.5" />
                      <path d="M10 9l4 3-4 3V9z" fill="#374151" />
                      <path d="M8 21h8M12 18v3" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <div className="text-center px-6">
                      <p className="text-white font-black text-base mb-1">Stream Not Found</p>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        "{movieTitle}" stream is not available right now.<br />
                        Try refreshing — links expire and regenerate.
                      </p>
                    </div>
                    <button
                      onClick={() => loadStream(id!, subjectType, selectedEpisode || undefined)}
                      className="flex items-center gap-2 bg-[#e50914] text-white px-5 py-2.5 rounded-xl text-sm font-black hover:bg-red-700 transition-colors"
                    >
                      <RefreshCw size={14} /> Try Again
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <VideoPlayer
                      streams={streams}
                      title={selectedEpisode
                        ? `${movieTitle} — S${selectedEpisode.season}E${selectedEpisode.episode} ${selectedEpisode.name}`
                        : movieTitle}
                      poster={movieCover}
                      onTimeUpdate={handleTimeUpdate}
                      startTime={startTime}
                      subtitleUrl={activeSubtitle}
                    />
                    {showAd && !isPremium && (
                      <StreamAdOverlay onClose={() => {
                        setShowAd(false);
                        adTimerRef.current = setTimeout(() => setShowAd(true), 20 * 60 * 1000);
                      }} />
                    )}
                  </div>
                )}
              </div>

              {/* Stream status bar */}
              {!isLoading && !streamError && streams.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-green-400 bg-green-950/30 border border-green-800/30 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5">
                    <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="currentColor" /></svg>
                    Stream Ready{activeStream?.resolutions ? ` · ${activeStream.resolutions}p` : ''}
                  </span>
                  <button
                    onClick={() => loadStream(id!, subjectType, selectedEpisode || undefined)}
                    className="text-xs text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1"
                  >
                    <RefreshCw size={11} /> Refresh link
                  </button>
                </div>
              )}

              {/* Title & Actions */}
              <div className="bg-[#141414] rounded-2xl p-5 border border-gray-800/40">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <h1 className="text-white text-xl sm:text-2xl font-black leading-tight">{movieTitle}</h1>
                    {selectedEpisode && (
                      <p className="text-[#e50914] text-sm font-semibold mt-1">
                        Season {selectedEpisode.season} · Episode {selectedEpisode.episode} — {selectedEpisode.name}
                      </p>
                    )}
                    {selectedEpisode?.synopsis && (
                      <p className="text-gray-500 text-xs mt-2 leading-relaxed max-w-xl">{selectedEpisode.synopsis}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`text-xs font-black px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${isTVShow ? 'bg-purple-600/20 text-purple-400' : 'bg-blue-600/20 text-blue-400'}`}>
                        {isTVShow ? <><Tv size={11} /> TV Series</> : <><Play size={11} /> Movie</>}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                    <button onClick={handleWatchlist}
                      className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border transition-all font-semibold ${inList ? 'bg-[#e50914] border-[#e50914] text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'}`}>
                      {inList ? <><Check size={14} /> Saved</> : <><Plus size={14} /> Watchlist</>}
                    </button>
                    <button onClick={handleShare}
                      className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white transition-all font-semibold">
                      <Share2 size={14} /> Share
                    </button>
                  </div>
                </div>
              </div>

              {/* TV Episodes + Download (side by side on large screens) */}
              {isTVShow && (
                <div className="bg-[#141414] rounded-2xl border border-gray-800/40 overflow-hidden">
                  <div className="flex items-center justify-between p-5 border-b border-gray-800/40">
                    <button onClick={() => setShowEpisodes(!showEpisodes)}
                      className="flex items-center gap-2 hover:text-white transition-colors flex-1 text-left">
                      <h2 className="text-white font-black text-base flex items-center gap-2">
                        <Tv size={16} className="text-purple-400" /> Episodes
                        {currentEpisodes.length > 0 && (
                          <span className="text-xs text-gray-500 font-normal">({currentEpisodes.length} eps)</span>
                        )}
                      </h2>
                      <ChevronDown size={18} className={`text-gray-500 transition-transform ${showEpisodes ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Download button near episode list */}
                    {activeStream?.proxyUrl && (
                      <a
                        href={activeStream.proxyUrl}
                        download
                        className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3.5 py-2 rounded-xl transition-all flex-shrink-0 ml-3"
                        title="Download current stream"
                      >
                        <Download size={13} /> Download
                      </a>
                    )}
                  </div>

                  {showEpisodes && (
                    <div>
                      {/* Season selector */}
                      {seasonData.length > 1 && (
                        <div className="flex gap-2 px-5 py-3 overflow-x-auto scrollbar-hide border-b border-gray-800/40">
                          {seasonData.map(s => (
                            <button key={s.season} onClick={() => setSelectedSeason(s.season)}
                              className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${selectedSeason === s.season ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-500 hover:text-white'}`}>
                              Season {s.season}
                            </button>
                          ))}
                        </div>
                      )}

                      {episodesLoading ? (
                        <div className="flex items-center justify-center py-10 gap-3">
                          <Loader size={20} className="text-purple-400 animate-spin" />
                          <span className="text-gray-500 text-sm">Loading episodes…</span>
                        </div>
                      ) : currentEpisodes.length === 0 ? (
                        <div className="text-center py-10 px-5">
                          <Tv size={36} className="text-gray-800 mx-auto mb-3" />
                          <p className="text-gray-600 text-sm font-semibold">Episode list unavailable</p>
                          <p className="text-gray-700 text-xs mt-1">Stream is playing above. Episodes may not be indexed yet.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-800/40 max-h-[400px] overflow-y-auto">
                          {currentEpisodes.map(ep => (
                            <button key={ep.id} onClick={() => handleEpisodePlay(ep)}
                              className={`w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-900/50 text-left transition-colors group ${selectedEpisode?.id === ep.id ? 'bg-purple-900/20' : ''}`}>
                              {/* Episode thumbnail */}
                              <div className="w-24 h-14 flex-shrink-0 rounded-xl overflow-hidden bg-gray-900 relative">
                                {ep.cover ? (
                                  <img src={ep.cover} alt={ep.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                                ) : null}
                                <div className={`absolute inset-0 flex items-center justify-center ${selectedEpisode?.id === ep.id ? 'bg-purple-900/50' : 'bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                                  <div className="w-7 h-7 rounded-full bg-[#e50914] flex items-center justify-center">
                                    <Play size={10} fill="white" className="text-white ml-0.5" />
                                  </div>
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-bold truncate ${selectedEpisode?.id === ep.id ? 'text-purple-400' : 'text-white'}`}>
                                  Ep {ep.episode}: {ep.name}
                                </p>
                                {ep.synopsis && <p className="text-gray-600 text-xs mt-0.5 line-clamp-2 leading-relaxed">{ep.synopsis}</p>}
                                {ep.airDate && <p className="text-gray-700 text-[10px] mt-1">{ep.airDate.slice(0, 10)}</p>}
                              </div>

                              {ep.duration && ep.duration > 0 && (
                                <span className="text-gray-700 text-[10px] flex-shrink-0">{ep.duration}min</span>
                              )}
                              {selectedEpisode?.id === ep.id && episodeLoading && (
                                <Loader size={14} className="text-purple-400 animate-spin flex-shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Download section for movies */}
              {!isTVShow && activeStream?.proxyUrl && (
                <div className="bg-[#141414] rounded-2xl p-4 border border-gray-800/40 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <Download size={18} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">Download</p>
                      <p className="text-gray-500 text-xs">Save for offline viewing</p>
                    </div>
                  </div>
                  <a
                    href={activeStream.proxyUrl}
                    download={`${movieTitle}.mp4`}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black px-4 py-2.5 rounded-xl transition-colors"
                  >
                    <Download size={14} /> Download{activeStream.resolutions ? ` ${activeStream.resolutions}p` : ''}
                  </a>
                </div>
              )}

              {/* Premium upsell */}
              {!isPremium && (
                <div className="bg-gradient-to-r from-[#1a0505] to-[#0d0d0d] border border-[#e50914]/25 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f5c518] to-yellow-600 flex items-center justify-center flex-shrink-0">
                      <Crown size={18} className="text-black" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">Upgrade to PlayMax+</p>
                      <p className="text-gray-500 text-xs">Ad-free HD streaming from ₦2,000/week</p>
                    </div>
                  </div>
                  <Link to="/premium" className="flex-shrink-0 bg-[#e50914] text-white text-xs font-black px-4 py-2 rounded-xl hover:bg-red-700 transition-colors">
                    Get Premium
                  </Link>
                </div>
              )}

              {!isPremium && <AdBanner variant="leaderboard" />}

              {/* ── Cast Section ─────────────────────────────────────── */}
              {castList.length > 0 && (
                <div className="bg-[#141414] rounded-2xl p-5 border border-gray-800/40">
                  <h2 className="text-white font-black text-base flex items-center gap-2 mb-4">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#e50914" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="#e50914" strokeWidth="1.8"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="#e50914" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    Cast
                  </h2>
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                    {castList.map((actor: string, i: number) => (
                      <div key={i} className="flex-shrink-0 w-20 text-center group">
                        <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 mb-2 flex items-center justify-center group-hover:border-[#e50914]/40 transition-colors">
                          <span className="text-gray-400 font-black text-lg group-hover:text-[#e50914] transition-colors">
                            {actor[0]?.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-gray-400 text-[11px] font-semibold line-clamp-2 leading-tight group-hover:text-white transition-colors">{actor}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ratings */}
              {id && <RatingsSection subjectId={id} subjectTitle={movieTitle} />}

              {/* Related */}
              {related.length > 0 && (
                <div>
                  <h3 className="text-white font-black text-lg mb-4 flex items-center gap-2">
                    <Star size={18} className="text-[#f5c518]" /> More Like This
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {related.slice(0, 8).map(m => <MovieCard key={m.subjectId} movie={m} size="sm" />)}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="xl:col-span-1 space-y-4">
              {!isPremium && <AdBanner variant="rectangle" />}
              {related.length > 0 && (
                <div className="bg-[#141414] rounded-2xl p-4 border border-gray-800/40">
                  <h3 className="text-white font-black text-sm mb-4 uppercase tracking-wider">Up Next</h3>
                  <div className="flex flex-col gap-3">
                    {related.slice(0, 8).map(m => (
                      <Link key={m.subjectId}
                        to={`/watch/${m.subjectId}?type=${m.subjectType}&title=${encodeURIComponent(m.title)}&cover=${encodeURIComponent(m.cover?.url || '')}`}
                        className="flex gap-3 group">
                        <div className="w-24 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-gray-900">
                          <img src={m.cover?.url} alt={m.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={e => { (e.target as HTMLImageElement).src = ''; }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-300 text-xs font-semibold line-clamp-2 group-hover:text-white transition-colors">{m.title}</p>
                          {m.imdbRatingValue && parseFloat(m.imdbRatingValue) > 0 && (
                            <span className="flex items-center gap-1 text-[#f5c518] text-[10px] mt-1">
                              <Star size={9} fill="#f5c518" /> {parseFloat(m.imdbRatingValue).toFixed(1)}
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

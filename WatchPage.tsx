import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/layout/Navbar';
import AdBanner from '@/components/features/AdBanner';
import VideoPlayer from '@/components/features/VideoPlayer';
import MovieCard from '@/components/features/MovieCard';
import { searchMovies, fetchShowboxDetail } from '@/lib/api';
import type { StreamQuality } from '@/types';
import { updateWatchHistory, isInWatchlist, addToWatchlist, removeFromWatchlist, getCurrentUser } from '@/lib/auth';
import { upsertWatchHistory, fetchReviews, upsertReview, fetchAvgRating, deleteReview } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import type { Review } from '@/lib/db';
import {
  Star, Plus, Check, Download, Share2, Crown, Loader, ArrowLeft,
  Tv, ChevronDown, Play, Timer, MessageSquare, Trash2, Lock, RefreshCw,
  SkipForward, Volume2, ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// ─── API constants ────────────────────────────────────────────────────────────
const SB_BASE = 'https://movieapi.xcasper.space/api';

// ─── Episode (with own subjectId for /api/play) ────────────────────────────
interface EpisodeInfo {
  subjectId: string;       // XCASPER episode-level subject ID — use for /api/play
  showboxEpisodeId?: string; // ShowBox numeric ID (fallback)
  episodeNum: number;
  seasonNum: number;
  name: string;
  synopsis?: string;
  cover?: string;
  airDate?: string;
  duration?: number;
  imdbRating?: string;
}

interface SeasonInfo {
  seasonNum: number;
  episodes: EpisodeInfo[];
}

// ─── Stream result from /api/play ─────────────────────────────────────────────
interface PlayResult {
  streams: StreamQuality[];
  subtitles: SubtitleTrack[];
  audioTracks: AudioTrack[];
}

interface SubtitleTrack {
  language: string;
  languageCode: string;
  url: string; // .srt URL
}

interface AudioTrack {
  language: string;
  languageCode: string;
  isOriginal: boolean;
  subjectId: string; // different subjectId per dub/sub version
  detailPath?: string;
}

// ─── Convert SRT URL → VTT blob URL (for <track> element) ────────────────────
async function srtUrlToVttBlobUrl(srtUrl: string): Promise<string | null> {
  try {
    const res = await fetch(srtUrl);
    if (!res.ok) return null;
    const srt = await res.text();
    // Convert SRT to VTT
    const vtt = 'WEBVTT\n\n' + srt
      .replace(/\r\n/g, '\n')
      .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
      .trim();
    const blob = new Blob([vtt], { type: 'text/vtt' });
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

// ─── Call /api/play?subjectId=ID to get streams, subtitles, audio tracks ─────
async function fetchPlayData(subjectId: string): Promise<PlayResult> {
  console.log('[play] Fetching /api/play?subjectId=', subjectId);
  const res = await fetch(`${SB_BASE}/play/${subjectId}`);
  if (!res.ok) throw new Error(`/api/play returned ${res.status}`);
  const json = await res.json();
  console.log('[play] Response keys:', Object.keys(json.data || json || {}));

  const data = json.data || json;

  // Extract streams — prefer proxyUrl
  const rawStreams: StreamQuality[] = (data.streams || []).map((s: Record<string, unknown>) => ({
    proxyUrl: String(s.proxyUrl || s.url || ''),
    resolutions: String(s.resolutions || s.resolution || ''),
    quality: String(s.resolutions || s.resolution || ''),
    url: String(s.url || ''),
    size: s.size ? String(s.size) : undefined,
    duration: s.duration ? Number(s.duration) : undefined,
  })).filter((s: StreamQuality) => s.proxyUrl);

  const subtitles: SubtitleTrack[] = (data.subtitles || []).map((s: Record<string, unknown>) => ({
    language: String(s.language || ''),
    languageCode: String(s.languageCode || ''),
    url: String(s.url || ''),
  })).filter((s: SubtitleTrack) => s.url);

  const audioTracks: AudioTrack[] = (data.audioTracks || []).map((a: Record<string, unknown>) => ({
    language: String(a.language || ''),
    languageCode: String(a.languageCode || ''),
    isOriginal: Boolean(a.isOriginal),
    subjectId: String(a.subjectId || ''),
    detailPath: a.detailPath ? String(a.detailPath) : undefined,
  })).filter((a: AudioTrack) => a.subjectId);

  return { streams: rawStreams, subtitles, audioTracks };
}

// ─── Fetch show's season/episode list (rich-detail gives episode subjectIds) ──
async function fetchShowEpisodes(showSubjectId: string, title: string): Promise<SeasonInfo[]> {
  // 1. Try rich-detail first (has episode-level subjectIds)
  try {
    const res = await fetch(`${SB_BASE}/rich-detail/${showSubjectId}`);
    if (res.ok) {
      const json = await res.json();
      const resource = json?.data?.resource || json?.resource;
      if (resource?.seasons && Array.isArray(resource.seasons)) {
        const seasons: SeasonInfo[] = resource.seasons.map((s: Record<string, unknown>) => ({
          seasonNum: Number(s.seasonNumber || s.season || 1),
          episodes: (Array.isArray(s.episodes) ? s.episodes : []).map((ep: Record<string, unknown>) => ({
            subjectId: String(ep.subjectId || ''),
            episodeNum: Number(ep.episodeNumber || ep.episode || 0),
            seasonNum: Number(s.seasonNumber || s.season || 1),
            name: String(ep.name || ep.title || `Episode ${ep.episodeNumber || ep.episode}`),
            synopsis: ep.synopsis ? String(ep.synopsis) : undefined,
            cover: ep.coverUrl ? String(ep.coverUrl) : ep.thumbs ? String(ep.thumbs) : undefined,
            airDate: ep.airDate ? String(ep.airDate) : undefined,
            duration: ep.duration ? Number(ep.duration) : undefined,
          })).filter((ep: EpisodeInfo) => ep.subjectId && ep.episodeNum > 0),
        })).filter((s: SeasonInfo) => s.episodes.length > 0);

        if (seasons.length > 0) {
          console.log('[episodes] Got from rich-detail:', seasons.length, 'seasons');
          return seasons;
        }
      }
    }
  } catch (e) {
    console.warn('[episodes] rich-detail failed:', e);
  }

  // 2. Fallback: ShowBox TV endpoint (doesn't have episode subjectIds, so we build stream URLs differently)
  try {
    // Search for ShowBox ID
    const searchRes = await fetch(`${SB_BASE}/showbox/search?keyword=${encodeURIComponent(title)}&type=tv`);
    const searchJson = await searchRes.json();
    const items: Record<string, unknown>[] = searchJson.data || [];
    const titleLower = title.toLowerCase();
    const match = (Array.isArray(items) ? items : []).find(
      (i: Record<string, unknown>) => String(i.title || '').toLowerCase() === titleLower
    ) || items[0];

    if (match?.id) {
      const showId = Number(match.id);
      const tvRes = await fetch(`${SB_BASE}/showbox/tv?id=${showId}`);
      const tvJson = await tvRes.json();
      const data = tvJson.data || {};
      const episodeList: Record<string, unknown>[] = data.episode || data.episodes || [];

      if (!Array.isArray(episodeList) || episodeList.length === 0) return [];

      // Group by season — note: no episode-level subjectId available here
      // We'll use showSubjectId+season+episode as a fake subjectId key for now
      const seasonMap = new Map<number, EpisodeInfo[]>();
      for (const ep of episodeList) {
        const s = Number(ep.season || 1);
        const epObj: EpisodeInfo = {
          subjectId: '', // Will be fetched via bff/stream approach
          showboxEpisodeId: String(ep.id || ''),
          episodeNum: Number(ep.episode || 0),
          seasonNum: s,
          name: String(ep.title || `Episode ${ep.episode}`),
          synopsis: ep.synopsis ? String(ep.synopsis) : undefined,
          cover: ep.thumbs ? String(ep.thumbs) : ep.thumbs_org ? String(ep.thumbs_org) : undefined,
          airDate: ep.released ? String(ep.released) : undefined,
          duration: Number(ep.runtime || 0),
          imdbRating: ep.imdb_rating ? String(ep.imdb_rating) : undefined,
        };
        if (!seasonMap.has(s)) seasonMap.set(s, []);
        seasonMap.get(s)!.push(epObj);
      }

      const seasons: SeasonInfo[] = Array.from(seasonMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([s, eps]) => ({
          seasonNum: s,
          episodes: eps.sort((a, b) => a.episodeNum - b.episodeNum),
        }));

      console.log('[episodes] Got from ShowBox TV:', seasons.length, 'seasons (no episode subjectIds)');
      return seasons;
    }
  } catch (e) {
    console.warn('[episodes] ShowBox fallback failed:', e);
  }

  return [];
}

// ─── Get streams for a TV episode ─────────────────────────────────────────────
// Uses episode subjectId if available, falls back to bff/stream with season/episode params
async function fetchEpisodeStreams(
  showSubjectId: string,
  episode: EpisodeInfo,
): Promise<PlayResult> {
  // Case A: Episode has its own subjectId (from rich-detail)
  if (episode.subjectId) {
    try {
      const result = await fetchPlayData(episode.subjectId);
      if (result.streams.length > 0) {
        console.log('[episode-stream] ✅ Using episode subjectId:', episode.subjectId);
        return result;
      }
    } catch (e) {
      console.warn('[episode-stream] Episode subjectId fetch failed, trying fallbacks:', e);
    }
  }

  // Case B: No episode subjectId — build bff/stream URLs with season/episode params
  // This is the correct format: /api/bff/stream?subjectId=SHOW_ID&season=S&episode=E&resolution=720
  console.log('[episode-stream] Using bff/stream with show subjectId + season/episode params');
  const resolutions = ['1080', '720', '480', '360'];
  const streams: StreamQuality[] = resolutions.map(res => ({
    proxyUrl: `${SB_BASE}/bff/stream?subjectId=${showSubjectId}&season=${episode.seasonNum}&episode=${episode.episodeNum}&resolution=${res}`,
    resolutions: res,
    quality: res,
  }));

  // Also try fetching subtitles from the show-level play endpoint
  let subtitles: SubtitleTrack[] = [];
  let audioTracks: AudioTrack[] = [];
  try {
    const showPlay = await fetchPlayData(showSubjectId);
    subtitles = showPlay.subtitles;
    audioTracks = showPlay.audioTracks;
  } catch {
    // ignore
  }

  return { streams, subtitles, audioTracks };
}

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

// ─── Auth gate ────────────────────────────────────────────────────────────────
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
          <Link to="/register" className="flex-1 bg-[#e50914] text-white font-black py-3 rounded-2xl text-sm hover:bg-red-700 transition-colors shadow-lg shadow-red-900/30">Join Free</Link>
          <Link to="/login" className="flex-1 border border-gray-700 text-gray-300 font-bold py-3 rounded-2xl text-sm hover:border-gray-500 hover:text-white transition-colors">Sign In</Link>
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

// ─── Main WatchPage ───────────────────────────────────────────────────────────
export default function WatchPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session, profile, loading: authLoading } = useAuth();

  const subjectType = searchParams.get('type') || '1';
  const movieTitle  = searchParams.get('title') || 'Unknown Title';
  const movieCover  = searchParams.get('cover') || '';
  const isTVShow    = subjectType === '2';

  // ─── Player state ──────────────────────────────────────────────────────────
  const [streams,       setStreams]       = useState<StreamQuality[]>([]);
  const [subtitles,     setSubtitles]     = useState<SubtitleTrack[]>([]);
  const [audioTracks,   setAudioTracks]   = useState<AudioTrack[]>([]);
  const [activeSubtitleVtt, setActiveSubtitleVtt] = useState<string | undefined>();
  const [activeSubtitleLang, setActiveSubtitleLang] = useState<string>('en');
  const [activeAudioIdx, setActiveAudioIdx] = useState(0);
  const [streamLoading, setStreamLoading] = useState(true);
  const [streamError,   setStreamError]   = useState(false);

  // ─── TV show episode state ─────────────────────────────────────────────────
  const [seasons,          setSeasons]          = useState<SeasonInfo[]>([]);
  const [seasonsLoading,   setSeasonsLoading]   = useState(false);
  const [selectedSeason,   setSelectedSeason]   = useState(1);
  const [currentEpIdx,     setCurrentEpIdx]     = useState(0); // index within season
  const [selectedEpisode,  setSelectedEpisode]  = useState<EpisodeInfo | null>(null);
  const [showEpisodePanel, setShowEpisodePanel] = useState(true);

  // ─── UI state ─────────────────────────────────────────────────────────────
  const [inList,  setInList]  = useState(false);
  const [showAd,  setShowAd]  = useState(false);
  const adTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── ShowBox detail for cast ───────────────────────────────────────────────
  const { data: sbDetail } = useQuery({
    queryKey: ['showbox-detail-watch', movieTitle, isTVShow ? 'tv' : 'movie'],
    queryFn: () => fetchShowboxDetail(movieTitle, isTVShow ? 'tv' : 'movie'),
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

  // ─── Convert subtitle SRT → VTT when subtitle changes ─────────────────────
  useEffect(() => {
    // Revoke previous blob URL
    if (activeSubtitleVtt?.startsWith('blob:')) {
      URL.revokeObjectURL(activeSubtitleVtt);
    }
    setActiveSubtitleVtt(undefined);

    const enSub = subtitles.find(s => s.languageCode === activeSubtitleLang || s.languageCode === 'en');
    if (!enSub?.url) return;

    srtUrlToVttBlobUrl(enSub.url).then(vttUrl => {
      if (vttUrl) setActiveSubtitleVtt(vttUrl);
    });

    return () => {
      // Cleanup on unmount
      if (activeSubtitleVtt?.startsWith('blob:')) {
        URL.revokeObjectURL(activeSubtitleVtt);
      }
    };
  }, [subtitles, activeSubtitleLang]);

  // ─── Load movie streams (non-TV) ─────────────────────────────────────────
  const loadMovieStream = useCallback(async (subjectId: string) => {
    setStreamLoading(true);
    setStreamError(false);
    setStreams([]);
    console.log('[WatchPage] Loading movie stream for subjectId:', subjectId);

    try {
      const result = await fetchPlayData(subjectId);
      if (result.streams.length > 0) {
        // Sort by resolution descending
        const sorted = [...result.streams].sort((a, b) =>
          parseInt(String(b.resolutions || 0)) - parseInt(String(a.resolutions || 0))
        );
        setStreams(sorted);
        setSubtitles(result.subtitles);
        setAudioTracks(result.audioTracks);
        console.log('[WatchPage] ✅ Movie streams:', sorted.length, '| subtitles:', result.subtitles.length, '| audio:', result.audioTracks.length);
      } else {
        // Fallback: build bff/stream URLs directly from subjectId
        console.warn('[WatchPage] /api/play returned no streams, falling back to bff/stream URLs');
        const fallbackStreams: StreamQuality[] = ['1080', '720', '480', '360'].map(res => ({
          proxyUrl: `${SB_BASE}/bff/stream?subjectId=${subjectId}&resolution=${res}`,
          resolutions: res,
          quality: res,
        }));
        setStreams(fallbackStreams);
      }
    } catch (err) {
      console.error('[WatchPage] Movie stream error:', err);
      // Still provide bff/stream fallback
      const fallbackStreams: StreamQuality[] = ['1080', '720', '480', '360'].map(res => ({
        proxyUrl: `${SB_BASE}/bff/stream?subjectId=${subjectId}&resolution=${res}`,
        resolutions: res,
        quality: res,
      }));
      setStreams(fallbackStreams);
    }

    setStreamLoading(false);
  }, []);

  // ─── Load TV show episodes ────────────────────────────────────────────────
  const loadTVEpisodes = useCallback(async (showSubjectId: string) => {
    setSeasonsLoading(true);
    console.log('[WatchPage] Loading TV episodes for:', showSubjectId, movieTitle);

    const seasonData = await fetchShowEpisodes(showSubjectId, movieTitle);
    setSeasons(seasonData);
    setSeasonsLoading(false);

    // Auto-play first episode
    if (seasonData.length > 0 && seasonData[0].episodes.length > 0) {
      const firstEp = seasonData[0].episodes[0];
      setSelectedSeason(seasonData[0].seasonNum);
      setCurrentEpIdx(0);
      setSelectedEpisode(firstEp);
      // Load first episode's streams
      await loadEpisodeStream(showSubjectId, firstEp);
    } else {
      // No episodes found — try playing the show itself
      console.warn('[WatchPage] No episodes found, playing show directly');
      await loadMovieStream(showSubjectId);
    }
  }, [movieTitle]);

  // ─── Load episode stream ──────────────────────────────────────────────────
  const loadEpisodeStream = useCallback(async (showSubjectId: string, episode: EpisodeInfo) => {
    setStreamLoading(true);
    setStreamError(false);
    setStreams([]);
    console.log('[WatchPage] Loading episode stream:', `S${episode.seasonNum}E${episode.episodeNum}`, episode.name, '| subjectId:', episode.subjectId || '(none)');

    try {
      const result = await fetchEpisodeStreams(showSubjectId, episode);
      if (result.streams.length > 0) {
        const sorted = [...result.streams].sort((a, b) =>
          parseInt(String(b.resolutions || 0)) - parseInt(String(a.resolutions || 0))
        );
        setStreams(sorted);
        setSubtitles(result.subtitles);
        setAudioTracks(result.audioTracks);
        console.log('[WatchPage] ✅ Episode streams:', sorted.length);
      } else {
        setStreamError(true);
      }
    } catch (err) {
      console.error('[WatchPage] Episode stream error:', err);
      setStreamError(true);
    }

    setStreamLoading(false);
  }, []);

  // ─── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id || authLoading || !session) return;

    if (isTVShow) {
      // TV: fetch episodes first, then auto-play ep 1
      loadTVEpisodes(id);
    } else {
      // Movie: directly call /api/play with the show's subjectId
      loadMovieStream(id);
    }
  }, [id, isTVShow, authLoading, session, loadTVEpisodes, loadMovieStream]);

  // ─── Episode click handler ────────────────────────────────────────────────
  const handleEpisodeClick = useCallback(async (episode: EpisodeInfo, epIdx: number) => {
    if (!id) return;
    setSelectedEpisode(episode);
    setCurrentEpIdx(epIdx);
    await loadEpisodeStream(id, episode);
    // Scroll to top of player
    window.scrollTo({ top: 68, behavior: 'smooth' });
  }, [id, loadEpisodeStream]);

  // ─── Next episode ─────────────────────────────────────────────────────────
  const handleNextEpisode = useCallback(async () => {
    const currentSeason = seasons.find(s => s.seasonNum === selectedSeason);
    if (!currentSeason) return;

    const nextIdx = currentEpIdx + 1;
    if (nextIdx < currentSeason.episodes.length) {
      // Next episode in same season
      await handleEpisodeClick(currentSeason.episodes[nextIdx], nextIdx);
    } else {
      // Try next season
      const nextSeason = seasons.find(s => s.seasonNum === selectedSeason + 1);
      if (nextSeason && nextSeason.episodes.length > 0) {
        setSelectedSeason(nextSeason.seasonNum);
        await handleEpisodeClick(nextSeason.episodes[0], 0);
        toast.success(`Season ${nextSeason.seasonNum}, Episode 1`);
      } else {
        toast.success('You have reached the end of the series!');
      }
    }
  }, [seasons, selectedSeason, currentEpIdx, handleEpisodeClick]);

  // ─── Audio track change ───────────────────────────────────────────────────
  const handleAudioTrackChange = useCallback(async (track: AudioTrack, idx: number) => {
    if (!track.subjectId) return;
    setActiveAudioIdx(idx);
    console.log('[audio] Switching to:', track.language, '| subjectId:', track.subjectId);
    try {
      const result = await fetchPlayData(track.subjectId);
      if (result.streams.length > 0) {
        const sorted = [...result.streams].sort((a, b) =>
          parseInt(String(b.resolutions || 0)) - parseInt(String(a.resolutions || 0))
        );
        setStreams(sorted);
        toast.success(`Switched to ${track.language}`);
      }
    } catch {
      toast.error('Failed to switch audio track');
    }
  }, []);

  // ─── Mid-stream ad timer ──────────────────────────────────────────────────
  useEffect(() => {
    if (isPremium) return;
    adTimerRef.current = setTimeout(() => setShowAd(true), 20 * 60 * 1000);
    return () => { if (adTimerRef.current) clearTimeout(adTimerRef.current); };
  }, [isPremium]);

  // ─── Related content ──────────────────────────────────────────────────────
  const { data: relatedData } = useQuery({
    queryKey: ['related', movieTitle],
    queryFn: () => searchMovies(movieTitle.split(' ')[0] || 'popular'),
    enabled: !!movieTitle,
    staleTime: 10 * 60 * 1000,
  });
  const related = (relatedData?.items || []).filter(m => m.subjectId !== id).slice(0, 12);

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

  // ─── Current season's episodes ────────────────────────────────────────────
  const currentSeasonData = seasons.find(s => s.seasonNum === selectedSeason) || seasons[0];
  const currentEpisodes = currentSeasonData?.episodes || [];

  // ─── Auth / loading guards ────────────────────────────────────────────────
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

  if (!session) return <AuthGate title={movieTitle} />;
  if (!id) return <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center text-white">Invalid content</div>;

  const activeStream = streams[0];
  const isLoading = streamLoading || (isTVShow && seasonsLoading && seasons.length === 0);

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

              {/* ── Player ────────────────────────────────────────────────── */}
              <div className="relative">
                {isLoading ? (
                  <div className="w-full aspect-video bg-gradient-to-br from-gray-900 to-[#111] rounded-2xl flex flex-col items-center justify-center gap-4 border border-gray-800/50">
                    <Loader size={36} className="text-[#e50914] animate-spin" />
                    <p className="text-gray-400 text-sm font-semibold">
                      {isTVShow && seasonsLoading && seasons.length === 0
                        ? 'Loading episode list…'
                        : selectedEpisode
                          ? `Loading S${selectedEpisode.seasonNum}E${selectedEpisode.episodeNum}…`
                          : 'Preparing stream…'}
                    </p>
                    <p className="text-gray-700 text-xs">{movieTitle}</p>
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
                        {selectedEpisode
                          ? `S${selectedEpisode.seasonNum}E${selectedEpisode.episodeNum} is not available.`
                          : `"${movieTitle}" stream is not available right now.`}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (selectedEpisode && id) loadEpisodeStream(id, selectedEpisode);
                        else if (id) loadMovieStream(id);
                      }}
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
                        ? `${movieTitle} — S${selectedEpisode.seasonNum}E${selectedEpisode.episodeNum} ${selectedEpisode.name}`
                        : movieTitle}
                      poster={movieCover}
                      onTimeUpdate={handleTimeUpdate}
                      startTime={startTime}
                      subtitleUrl={activeSubtitleVtt}
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

              {/* ── Stream status bar ──────────────────────────────────────── */}
              {!isLoading && !streamError && streams.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-green-400 bg-green-950/30 border border-green-800/30 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5">
                    <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="currentColor" /></svg>
                    Stream Ready
                    {activeStream?.resolutions ? ` · ${activeStream.resolutions}p` : ''}
                    {selectedEpisode ? ` · S${selectedEpisode.seasonNum}E${selectedEpisode.episodeNum}` : ''}
                  </span>
                  {/* Subtitle selector */}
                  {subtitles.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-600">CC:</span>
                      <select
                        value={activeSubtitleLang}
                        onChange={e => setActiveSubtitleLang(e.target.value)}
                        className="text-xs bg-gray-800 text-gray-300 border border-gray-700 rounded-lg px-2 py-0.5 focus:outline-none"
                      >
                        <option value="">Off</option>
                        {subtitles.map(s => (
                          <option key={s.languageCode} value={s.languageCode}>{s.language}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {/* Audio track selector */}
                  {audioTracks.length > 1 && (
                    <div className="flex items-center gap-1">
                      <Volume2 size={11} className="text-gray-600" />
                      <select
                        value={activeAudioIdx}
                        onChange={e => {
                          const idx = parseInt(e.target.value);
                          handleAudioTrackChange(audioTracks[idx], idx);
                        }}
                        className="text-xs bg-gray-800 text-gray-300 border border-gray-700 rounded-lg px-2 py-0.5 focus:outline-none"
                      >
                        {audioTracks.map((a, i) => (
                          <option key={i} value={i}>{a.language}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      if (selectedEpisode && id) loadEpisodeStream(id, selectedEpisode);
                      else if (id) loadMovieStream(id);
                    }}
                    className="text-xs text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1"
                  >
                    <RefreshCw size={11} /> Refresh
                  </button>
                  {/* Next episode button */}
                  {isTVShow && currentEpisodes.length > 0 && (
                    <button
                      onClick={handleNextEpisode}
                      className="flex items-center gap-1.5 text-xs font-bold text-purple-400 hover:text-purple-300 bg-purple-900/20 border border-purple-800/30 px-3 py-1 rounded-full transition-colors"
                    >
                      <SkipForward size={11} /> Next Episode
                    </button>
                  )}
                </div>
              )}

              {/* ── Title & Actions ────────────────────────────────────────── */}
              <div className="bg-[#141414] rounded-2xl p-5 border border-gray-800/40">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <h1 className="text-white text-xl sm:text-2xl font-black leading-tight">{movieTitle}</h1>
                    {selectedEpisode && (
                      <p className="text-[#e50914] text-sm font-semibold mt-1">
                        Season {selectedEpisode.seasonNum} · Episode {selectedEpisode.episodeNum} — {selectedEpisode.name}
                      </p>
                    )}
                    {selectedEpisode?.synopsis && (
                      <p className="text-gray-500 text-xs mt-2 leading-relaxed max-w-xl">{selectedEpisode.synopsis}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={`text-xs font-black px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${isTVShow ? 'bg-purple-600/20 text-purple-400' : 'bg-blue-600/20 text-blue-400'}`}>
                        {isTVShow ? <><Tv size={11} /> TV Series</> : <><Play size={11} /> Movie</>}
                      </span>
                      {seasons.length > 0 && (
                        <span className="text-xs text-gray-600">{seasons.length} Season{seasons.length > 1 ? 's' : ''}</span>
                      )}
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
                    {!isTVShow && activeStream?.proxyUrl && (
                      <a href={activeStream.proxyUrl} download={`${movieTitle}.mp4`}
                        className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border border-gray-700 text-gray-400 hover:border-blue-500 hover:text-blue-400 transition-all font-semibold">
                        <Download size={14} /> Download
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* ── TV Episode Panel ───────────────────────────────────────── */}
              {isTVShow && (
                <div className="bg-[#141414] rounded-2xl border border-gray-800/40 overflow-hidden">
                  {/* Panel header */}
                  <div className="flex items-center justify-between p-5 border-b border-gray-800/40">
                    <button onClick={() => setShowEpisodePanel(!showEpisodePanel)}
                      className="flex items-center gap-2 hover:text-white transition-colors flex-1 text-left">
                      <h2 className="text-white font-black text-base flex items-center gap-2">
                        <Tv size={16} className="text-purple-400" /> Episodes
                        {currentEpisodes.length > 0 && (
                          <span className="text-xs text-gray-500 font-normal">({currentEpisodes.length} eps)</span>
                        )}
                      </h2>
                      <ChevronDown size={18} className={`text-gray-500 transition-transform ${showEpisodePanel ? 'rotate-180' : ''}`} />
                    </button>
                    {selectedEpisode && activeStream?.proxyUrl && (
                      <a href={activeStream.proxyUrl} download
                        className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3.5 py-2 rounded-xl transition-all flex-shrink-0 ml-3">
                        <Download size={13} /> Download
                      </a>
                    )}
                  </div>

                  {showEpisodePanel && (
                    <div>
                      {/* Season tabs */}
                      {seasons.length > 1 && (
                        <div className="flex gap-2 px-5 py-3 overflow-x-auto scrollbar-hide border-b border-gray-800/40">
                          {seasons.map(s => (
                            <button key={s.seasonNum} onClick={() => setSelectedSeason(s.seasonNum)}
                              className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${selectedSeason === s.seasonNum ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-500 hover:text-white'}`}>
                              Season {s.seasonNum}
                            </button>
                          ))}
                        </div>
                      )}

                      {seasonsLoading && seasons.length === 0 ? (
                        <div className="flex items-center justify-center py-10 gap-3">
                          <Loader size={20} className="text-purple-400 animate-spin" />
                          <span className="text-gray-500 text-sm">Loading episodes…</span>
                        </div>
                      ) : currentEpisodes.length === 0 ? (
                        <div className="text-center py-10 px-5">
                          <Tv size={36} className="text-gray-800 mx-auto mb-3" />
                          <p className="text-gray-600 text-sm font-semibold">Episode list unavailable</p>
                          <p className="text-gray-700 text-xs mt-1">Stream is playing above.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-800/40 max-h-[480px] overflow-y-auto">
                          {currentEpisodes.map((ep, epIdx) => {
                            const isActive = selectedEpisode?.episodeNum === ep.episodeNum
                              && selectedEpisode?.seasonNum === ep.seasonNum;
                            return (
                              <button
                                key={`s${ep.seasonNum}e${ep.episodeNum}`}
                                onClick={() => handleEpisodeClick(ep, epIdx)}
                                className={`w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-900/50 text-left transition-colors group ${isActive ? 'bg-purple-900/20' : ''}`}
                              >
                                {/* Thumbnail */}
                                <div className="w-24 h-14 flex-shrink-0 rounded-xl overflow-hidden bg-gray-900 relative">
                                  {ep.cover ? (
                                    <img src={ep.cover} alt={ep.name}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <span className="text-gray-700 text-xs font-bold">E{ep.episodeNum}</span>
                                    </div>
                                  )}
                                  <div className={`absolute inset-0 flex items-center justify-center ${isActive ? 'bg-purple-900/50' : 'bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                                    <div className="w-7 h-7 rounded-full bg-[#e50914] flex items-center justify-center">
                                      {isActive && streamLoading
                                        ? <Loader size={10} className="text-white animate-spin" />
                                        : <Play size={10} fill="white" className="text-white ml-0.5" />
                                      }
                                    </div>
                                  </div>
                                </div>

                                {/* Episode info */}
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-bold truncate ${isActive ? 'text-purple-400' : 'text-white'}`}>
                                    Ep {ep.episodeNum}: {ep.name}
                                  </p>
                                  {ep.synopsis && (
                                    <p className="text-gray-600 text-xs mt-0.5 line-clamp-2 leading-relaxed">{ep.synopsis}</p>
                                  )}
                                  {ep.imdbRating && parseFloat(ep.imdbRating) > 0 && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <Star size={9} fill="#f5c518" className="text-[#f5c518]" />
                                      <span className="text-[#f5c518] text-[10px] font-bold">{ep.imdbRating}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Duration + next arrow */}
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                  {ep.duration && ep.duration > 0 && (
                                    <span className="text-gray-700 text-[10px]">{ep.duration}min</span>
                                  )}
                                  <ChevronRight size={14} className="text-gray-700 group-hover:text-gray-400 transition-colors" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Premium upsell ─────────────────────────────────────────── */}
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

              {/* ── Cast ──────────────────────────────────────────────────── */}
              {castList.length > 0 && (
                <div className="bg-[#141414] rounded-2xl p-5 border border-gray-800/40">
                  <h2 className="text-white font-black text-base flex items-center gap-2 mb-4">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="#e50914" strokeWidth="1.8" strokeLinecap="round"/>
                      <circle cx="9" cy="7" r="4" stroke="#e50914" strokeWidth="1.8"/>
                      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="#e50914" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                    Cast
                  </h2>
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                    {castList.map((actor: string, i: number) => (
                      <div key={i} className="flex-shrink-0 w-20 text-center group">
                        <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 mb-2 flex items-center justify-center group-hover:border-[#e50914]/40 transition-colors">
                          <span className="text-gray-400 font-black text-lg group-hover:text-[#e50914] transition-colors">{actor[0]?.toUpperCase()}</span>
                        </div>
                        <p className="text-gray-400 text-[11px] font-semibold line-clamp-2 leading-tight group-hover:text-white transition-colors">{actor}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Ratings & Reviews ─────────────────────────────────────── */}
              {id && <RatingsSection subjectId={id} subjectTitle={movieTitle} />}

              {/* ── Related ───────────────────────────────────────────────── */}
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

            {/* ── Sidebar ────────────────────────────────────────────────── */}
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

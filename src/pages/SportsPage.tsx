import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import VideoPlayer from '@/components/features/VideoPlayer';
import type { StreamQuality } from '@/types';
import { X, Play, Trophy, RefreshCw, Clock, ChevronRight } from 'lucide-react';

const CASPER_SPORTS_BASE = 'https://movieapi.xcasper.space/api';

interface CasperTeam {
  id: string;
  name: string;
  avatar: string;
  score: string;
}

interface CasperHighlight {
  id: string;
  title: string;
  path: string;
  cover: { url: string; id: string } | string;
  duration: string | number;
  createTime: string | number;
  stat?: { viewCount: string };
}

interface CasperMatch {
  id: string;
  team1: CasperTeam;
  team2: CasperTeam;
  status: string;
  statusLive: string;
  league: string;
  leagueId: string;
  playPath: string;
  playType: string;
  startTime: number;
  endTime: number;
  timeDesc: string;
  type: string;
  replay: null | { path: string };
  highlights: CasperHighlight[];
}

interface CasperNewsItem {
  id: string;
  title: string;
  path: string;
  cover: string;
}

interface CasperSportsResponse {
  code: number;
  success: boolean;
  data: {
    matchList: CasperMatch[];
    newsList: CasperNewsItem[];
    highlights: CasperHighlight[];
  };
}

// ─── SVG Icons ─────────────────────────────────────────────────────────────────
const FootballSVG = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
    <polygon points="12,6 14,10 18,10 15,13 16,17 12,15 8,17 9,13 6,10 10,10" fill="currentColor" opacity="0.7" />
  </svg>
);

const BasketballSVG = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
    <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="1.2" />
    <path d="M5 5c4 2 4 10 0 14M19 5c-4 2-4 10 0 14" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

const LiveDotSVG = ({ color = '#4ade80' }: { color?: string }) => (
  <svg width="8" height="8" viewBox="0 0 8 8">
    <circle cx="4" cy="4" r="4" fill={color} />
  </svg>
);

function getStatusInfo(match: CasperMatch) {
  if (match.status === 'MatchLiving' || match.statusLive === 'Living') {
    return { label: 'LIVE', color: 'text-green-400', bg: 'bg-green-900/30 border-green-700/40', dot: '#4ade80' };
  }
  if (match.status === 'MatchEnded') {
    return { label: 'Ended', color: 'text-gray-500', bg: 'bg-gray-900/20 border-gray-800/30', dot: '#6b7280' };
  }
  const startDate = new Date(match.startTime);
  const timeStr = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return { label: timeStr, color: 'text-blue-400', bg: 'bg-blue-900/20 border-blue-800/30', dot: '#60a5fa' };
}

function formatDuration(sec: string | number): string {
  const s = parseInt(String(sec));
  if (!s) return '';
  const m = Math.floor(s / 60);
  const remainder = s % 60;
  return `${m}:${String(remainder).padStart(2, '0')}`;
}

// ─── Highlight Player Modal ────────────────────────────────────────────────────
function HighlightModal({ highlight, onClose }: { highlight: CasperHighlight; onClose: () => void }) {
  const coverUrl = typeof highlight.cover === 'object' ? highlight.cover?.url : highlight.cover;
  const stream: StreamQuality = { proxyUrl: highlight.path };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-3xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-white font-bold text-sm line-clamp-1 flex-1 mr-3">{highlight.title}</p>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 flex-shrink-0">
            <X size={20} />
          </button>
        </div>
        <VideoPlayer
          streams={[stream]}
          title={highlight.title}
          poster={coverUrl}
        />
        <div className="flex items-center gap-3 mt-3">
          {formatDuration(highlight.duration) && (
            <span className="text-gray-500 text-xs flex items-center gap-1">
              <Clock size={11} /> {formatDuration(highlight.duration)}
            </span>
          )}
          {highlight.stat?.viewCount && parseInt(highlight.stat.viewCount) > 0 && (
            <span className="text-gray-500 text-xs">{parseInt(highlight.stat.viewCount).toLocaleString()} views</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Match Card ────────────────────────────────────────────────────────────────
function MatchCard({ match, onHighlightPlay }: { match: CasperMatch; onHighlightPlay: (h: CasperHighlight) => void }) {
  const status = getStatusInfo(match);
  const isLive = match.status === 'MatchLiving' || match.statusLive === 'Living';
  const isEnded = match.status === 'MatchEnded';
  const SportIcon = match.type === 'basketball' ? BasketballSVG : FootballSVG;

  return (
    <div className={`bg-[#141414] rounded-2xl border ${status.bg} overflow-hidden`}>
      {/* League header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800/40">
        <div className="flex items-center gap-2">
          <span className="text-gray-400"><SportIcon /></span>
          <span className="text-gray-300 text-xs font-bold uppercase tracking-wider">{match.league}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <LiveDotSVG color={status.dot} />
          <span className={`text-xs font-black ${status.color}`}>{status.label}</span>
        </div>
      </div>

      {/* Teams */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          {/* Team 1 */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <img src={match.team1.avatar} alt={match.team1.name}
              className="w-12 h-12 rounded-full object-cover bg-gray-800 ring-2 ring-gray-700"
              onError={e => { (e.currentTarget as HTMLImageElement).src = ''; (e.currentTarget as HTMLImageElement).className = 'w-12 h-12 rounded-full bg-gray-800'; }} />
            <span className="text-white text-xs font-bold text-center leading-tight">{match.team1.name}</span>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0 px-2">
            {isEnded || isLive ? (
              <>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-black ${isLive ? 'text-green-400' : 'text-white'}`}>{match.team1.score}</span>
                  <span className="text-gray-600 text-lg font-bold">:</span>
                  <span className={`text-2xl font-black ${isLive ? 'text-green-400' : 'text-white'}`}>{match.team2.score}</span>
                </div>
                {isLive && match.timeDesc && <span className="text-green-400/70 text-[10px] font-bold">{match.timeDesc}</span>}
              </>
            ) : (
              <span className="text-gray-500 text-sm font-bold">VS</span>
            )}
          </div>

          {/* Team 2 */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <img src={match.team2.avatar} alt={match.team2.name}
              className="w-12 h-12 rounded-full object-cover bg-gray-800 ring-2 ring-gray-700"
              onError={e => { (e.currentTarget as HTMLImageElement).src = ''; (e.currentTarget as HTMLImageElement).className = 'w-12 h-12 rounded-full bg-gray-800'; }} />
            <span className="text-white text-xs font-bold text-center leading-tight">{match.team2.name}</span>
          </div>
        </div>
      </div>

      {/* Highlights */}
      {match.highlights && match.highlights.length > 0 && (
        <div className="border-t border-gray-800/40 px-4 py-3">
          <p className="text-gray-600 text-[10px] uppercase font-bold tracking-wider mb-2">Highlights</p>
          <div className="flex flex-col gap-1.5">
            {match.highlights.slice(0, 3).map(h => (
              <button key={h.id} onClick={() => onHighlightPlay(h)}
                className="flex items-center gap-2.5 text-left hover:bg-gray-800/40 rounded-xl px-2 py-1.5 transition-colors group">
                <div className="w-7 h-7 rounded-lg bg-[#e50914]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[#e50914]/40 transition-colors">
                  <Play size={11} fill="#e50914" className="text-[#e50914] ml-0.5" />
                </div>
                <span className="text-gray-400 text-xs group-hover:text-white transition-colors line-clamp-1 flex-1">{h.title}</span>
                {h.duration && <span className="text-gray-700 text-[10px] flex-shrink-0">{formatDuration(h.duration)}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Highlight Grid ────────────────────────────────────────────────────────────
function HighlightCard({ highlight, onPlay }: { highlight: CasperHighlight; onPlay: () => void }) {
  const coverUrl = typeof highlight.cover === 'object' ? highlight.cover?.url : (highlight.cover as string);
  return (
    <div className="group cursor-pointer" onClick={onPlay}>
      <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900 mb-2">
        {coverUrl && (
          <img src={coverUrl} alt={highlight.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        )}
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-[#e50914]/85 backdrop-blur-sm flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
            <Play size={18} fill="white" className="text-white ml-0.5" />
          </div>
        </div>
        {highlight.duration && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            {formatDuration(highlight.duration)}
          </span>
        )}
      </div>
      <p className="text-gray-300 text-xs font-semibold line-clamp-2 group-hover:text-white transition-colors leading-relaxed">
        {highlight.title}
      </p>
      {highlight.stat?.viewCount && parseInt(highlight.stat.viewCount) > 0 && (
        <p className="text-gray-700 text-[10px] mt-0.5">{parseInt(highlight.stat.viewCount).toLocaleString()} views</p>
      )}
    </div>
  );
}

// ─── Main SportsPage ───────────────────────────────────────────────────────────
export default function SportsPage() {
  const [activeHighlight, setActiveHighlight] = useState<CasperHighlight | null>(null);
  const [activeTab, setActiveTab] = useState<'matches' | 'highlights' | 'news'>('matches');

  const { data, isLoading, refetch, isFetching } = useQuery<CasperSportsResponse>({
    queryKey: ['casper-sports'],
    queryFn: async () => {
      const res = await fetch(`${CASPER_SPORTS_BASE}/sports/home`);
      if (!res.ok) throw new Error('Sports API failed');
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });

  const matches = data?.data?.matchList || [];
  const highlights = data?.data?.highlights || [];
  const newsList = data?.data?.newsList || [];

  const liveMatches = matches.filter(m => m.status === 'MatchLiving' || m.statusLive === 'Living');
  const upcomingMatches = matches.filter(m => m.status === 'MatchNotStart');
  const endedMatches = matches.filter(m => m.status === 'MatchEnded');

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <Navbar />
      {activeHighlight && (
        <HighlightModal highlight={activeHighlight} onClose={() => setActiveHighlight(null)} />
      )}

      <main className="pt-20 pb-16">
        <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-green-800 flex items-center justify-center shadow-lg">
                <Trophy size={20} className="text-green-300" />
              </div>
              <div>
                <h1 className="text-white text-2xl font-black">Sports</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <LiveDotSVG color="#4ade80" />
                  <span className="text-green-400 text-xs font-semibold">
                    {liveMatches.length > 0 ? `${liveMatches.length} match${liveMatches.length > 1 ? 'es' : ''} live now` : 'Matches & Highlights'}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={() => refetch()} disabled={isFetching}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-xl bg-[#1a1a1a] border border-gray-800 hover:border-gray-600">
              <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-[#141414] border border-gray-800/40 p-1 rounded-xl mb-6 w-fit">
            {(['matches', 'highlights', 'news'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${activeTab === tab ? 'bg-[#e50914] text-white' : 'text-gray-500 hover:text-white'}`}>
                {tab}
                {tab === 'matches' && matches.length > 0 && (
                  <span className="ml-1.5 text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{matches.length}</span>
                )}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 skeleton rounded-2xl" />
              ))}
            </div>
          ) : (
            <>
              {/* ─── MATCHES TAB ─── */}
              {activeTab === 'matches' && (
                <div className="space-y-6">
                  {matches.length === 0 ? (
                    <div className="text-center py-20 border border-gray-800/50 rounded-2xl">
                      <Trophy size={48} className="text-gray-800 mx-auto mb-4" />
                      <p className="text-gray-500 font-semibold">No matches available right now</p>
                      <button onClick={() => refetch()} className="mt-3 text-[#e50914] text-sm font-semibold">Refresh</button>
                    </div>
                  ) : (
                    <>
                      {liveMatches.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <LiveDotSVG color="#4ade80" />
                            <h2 className="text-green-400 text-sm font-black uppercase tracking-wider">Live Now</h2>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {liveMatches.map(m => (
                              <MatchCard key={m.id} match={m} onHighlightPlay={setActiveHighlight} />
                            ))}
                          </div>
                        </div>
                      )}

                      {upcomingMatches.length > 0 && (
                        <div>
                          <h2 className="text-gray-500 text-xs font-black uppercase tracking-wider mb-3">Upcoming</h2>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {upcomingMatches.map(m => (
                              <MatchCard key={m.id} match={m} onHighlightPlay={setActiveHighlight} />
                            ))}
                          </div>
                        </div>
                      )}

                      {endedMatches.length > 0 && (
                        <div>
                          <h2 className="text-gray-500 text-xs font-black uppercase tracking-wider mb-3">Recent Results</h2>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {endedMatches.map(m => (
                              <MatchCard key={m.id} match={m} onHighlightPlay={setActiveHighlight} />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ─── HIGHLIGHTS TAB ─── */}
              {activeTab === 'highlights' && (
                <div>
                  {highlights.length === 0 ? (
                    <div className="text-center py-20 border border-gray-800/50 rounded-2xl">
                      <Play size={48} className="text-gray-800 mx-auto mb-4" />
                      <p className="text-gray-500 font-semibold">No highlights available</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {highlights.map(h => (
                        <HighlightCard key={h.id} highlight={h} onPlay={() => setActiveHighlight(h)} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── NEWS TAB ─── */}
              {activeTab === 'news' && (
                <div>
                  {newsList.length === 0 ? (
                    <div className="text-center py-20 border border-gray-800/50 rounded-2xl">
                      <p className="text-gray-500 font-semibold">No news available</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {newsList.map(n => (
                        <div key={n.id} className="bg-[#141414] rounded-2xl overflow-hidden border border-gray-800/40 flex gap-3 p-3 items-center">
                          {n.cover && (
                            <img src={n.cover} alt={n.title}
                              className="w-20 h-16 rounded-xl object-cover flex-shrink-0 bg-gray-900" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-300 text-sm font-semibold line-clamp-3 leading-relaxed">{n.title}</p>
                          </div>
                          <ChevronRight size={16} className="text-gray-700 flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

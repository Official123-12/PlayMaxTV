import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/features/HeroSection';
import CategoryRow from '@/components/features/CategoryRow';
import AdBanner from '@/components/features/AdBanner';
import PWAInstallPrompt from '@/components/features/PWAInstallPrompt';
import { fetchTrending, fetchBrowse, searchMovies } from '@/lib/api';
import type { Movie } from '@/types';
import { Link } from 'react-router-dom';
import { Crown, Play, Zap, Shield, Wifi, Download, Clock, ChevronRight } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
import { CATEGORIES } from '@/constants';
import { useWatchHistory } from '@/hooks/useWatchHistory';

// SVG category icons
const CategoryIcon = ({ id }: { id: string }) => {
  const icons: Record<string, JSX.Element> = {
    movies: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M8 9l4 3-4 3V9z" fill="currentColor"/></svg>,
    tvshows: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M16 2l-4 5M8 2l4 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    sports: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><path d="M12 2c0 0-3 4-3 10s3 10 3 10M12 2c0 0 3 4 3 10s-3 10-3 10M2 12h20" stroke="currentColor" strokeWidth="1.5"/></svg>,
    livetv: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 9h3v11h14V9h3L12 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><rect x="9" y="13" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg>,
    cartoons: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><circle cx="9" cy="10" r="1.5" fill="currentColor"/><circle cx="15" cy="10" r="1.5" fill="currentColor"/><path d="M9 15c1 1.5 5 1.5 6 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    anime: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2C7 2 3 6 3 11s4 9 9 9 9-4 9-9-4-9-9-9z" stroke="currentColor" strokeWidth="1.8"/><circle cx="9" cy="11" r="1" fill="currentColor"/><circle cx="15" cy="11" r="1" fill="currentColor"/><path d="M9 14.5c1 1 3 1.5 6 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  };
  return icons[id] || null;
};

export default function Index() {
  const { session } = useAuth();
  const { history: watchHistory } = useWatchHistory();

  const { data: trending = [], isLoading: loadingTrending } = useQuery({
    queryKey: ['trending'],
    queryFn: fetchTrending,
    staleTime: 5 * 60 * 1000,
  });

  const { data: moviesData, isLoading: loadingMovies } = useQuery({
    queryKey: ['browse', 'movie'],
    queryFn: () => fetchBrowse('movie'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: tvData, isLoading: loadingTv } = useQuery({
    queryKey: ['browse', 'tv'],
    queryFn: () => fetchBrowse('tv'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: animeData } = useQuery({
    queryKey: ['search', 'anime'],
    queryFn: () => searchMovies('anime'),
    staleTime: 10 * 60 * 1000,
  });

  const { data: cartoonData } = useQuery({
    queryKey: ['search', 'cartoon animation'],
    queryFn: () => searchMovies('cartoon animation'),
    staleTime: 10 * 60 * 1000,
  });

  const heroMovies: Movie[] = [
    ...trending.filter(m => m.stills?.url),
    ...trending,
  ].filter((m, i, arr) => arr.findIndex(x => x.subjectId === m.subjectId) === i).slice(0, 6);

  // Continue watching — from localStorage watch history
  const continueWatchingMovies: Movie[] = watchHistory.slice(0, 8).map(h => ({
    subjectId: h.subjectId,
    title: h.title,
    cover: { url: h.cover, width: 300, height: 450 },
    subjectType: h.subjectType,
    imdbRatingValue: '',
    imdbRatingCount: 0,
    genre: '',
    duration: h.duration,
    releaseDate: '',
    countryName: '',
    subtitles: '',
    hasResource: true,
    detailPath: '',
    staffList: [],
    description: '',
  })) as Movie[];

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <Navbar />
      <PWAInstallPrompt />
      <main>
        {/* Hero */}
        <div className="pt-[68px]">
          {loadingTrending ? (
            <div className="w-full h-[60vh] sm:h-[68vh] lg:h-[86vh] skeleton" />
          ) : (
            <HeroSection movies={heroMovies} />
          )}
        </div>

        {/* Quick Category Scroll */}
        <div className="flex gap-2.5 px-4 sm:px-6 lg:px-8 py-5 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map(cat => (
            <Link key={cat.id} to={cat.path}
              className="flex-shrink-0 flex items-center gap-2 text-sm font-bold bg-[#1a1a1a] text-gray-300 px-4 py-2.5 rounded-xl border border-gray-800/60 hover:border-[#e50914]/50 hover:text-white hover:bg-[#1f1f1f] transition-all">
              <CategoryIcon id={cat.id} />
              {cat.label}
              <ChevronRight size={14} className="text-gray-600" />
            </Link>
          ))}
        </div>

        {/* Continue Watching */}
        {session && continueWatchingMovies.length > 0 && (
          <section className="mb-10 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-6 rounded-full bg-[#e50914]" />
              <h2 className="text-white text-lg sm:text-xl font-black">Continue Watching</h2>
              <Clock size={16} className="text-gray-500" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {continueWatchingMovies.map(movie => {
                const hist = watchHistory.find(h => h.subjectId === movie.subjectId);
                const pct = hist && hist.duration ? Math.min((hist.timestamp / hist.duration) * 100, 100) : 0;
                return (
                  <Link key={movie.subjectId}
                    to={`/watch/${movie.subjectId}?type=${movie.subjectType}&title=${encodeURIComponent(movie.title)}&cover=${encodeURIComponent(movie.cover?.url || '')}`}
                    className="group block">
                    <div className="relative h-32 sm:h-40 rounded-xl overflow-hidden bg-gray-900 group-hover:-translate-y-1 transition-transform duration-300 shadow-lg">
                      {movie.cover?.url && (
                        <img src={movie.cover.url} alt={movie.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 rounded-full bg-[#e50914] flex items-center justify-center shadow-xl">
                          <Play size={20} fill="white" className="text-white ml-1" />
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800/80">
                        <div className="h-full bg-[#e50914] transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <p className="text-gray-300 text-xs font-semibold mt-2 line-clamp-1 group-hover:text-white transition-colors">{movie.title}</p>
                    {hist?.duration && hist.duration > 0 && pct > 1 && (
                      <p className="text-gray-700 text-[10px] mt-0.5">{Math.round(pct)}% watched</p>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Trending */}
        <CategoryRow title="Trending Now" movies={trending} isLoading={loadingTrending} size="lg" accent="#e50914" viewAllPath="/movies" />

        {/* Ad */}
        <div className="px-4 sm:px-6 lg:px-8">
          <AdBanner variant="leaderboard" />
        </div>

        {/* Movies */}
        <CategoryRow title="Popular Movies" movies={moviesData?.items || []} isLoading={loadingMovies} accent="#3b82f6" viewAllPath="/movies" />

        {/* TV Shows */}
        <CategoryRow title="TV Shows & Series" movies={tvData?.items || []} isLoading={loadingTv} accent="#8b5cf6" viewAllPath="/tvshows" />

        {/* Inline Ad */}
        <div className="px-4 sm:px-6 lg:px-8">
          <AdBanner variant="inline" />
        </div>

        {/* Anime */}
        {animeData?.items && animeData.items.length > 0 && (
          <CategoryRow title="Anime" movies={animeData.items} accent="#ec4899" viewAllPath="/anime" />
        )}

        {/* Cartoons */}
        {cartoonData?.items && cartoonData.items.length > 0 && (
          <CategoryRow title="Cartoons & Animation" movies={cartoonData.items} accent="#f59e0b" viewAllPath="/cartoons" />
        )}

        {/* Premium CTA */}
        <div className="mx-4 sm:mx-6 lg:mx-8 my-12 rounded-3xl overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a0000] via-[#2d0000] to-[#0d0d0d]" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#e50914]/10 rounded-full blur-3xl" />
          <div className="relative px-8 py-12 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Crown size={22} className="text-[#f5c518]" />
                <span className="text-[#f5c518] font-black text-sm uppercase tracking-widest">PlayMax+ Premium</span>
              </div>
              <h2 className="text-white text-3xl sm:text-4xl font-black mb-3 leading-tight">
                Unlimited Streaming.<br />
                <span className="text-[#e50914]">Zero Ads. Pure Cinema.</span>
              </h2>
              <p className="text-gray-400 text-sm mb-6 max-w-lg leading-relaxed">
                Experience movies in stunning HD/Ultra HD, download for offline viewing, and enjoy ad-free streaming.
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-300">
                {([['Zap', 'Ad-Free'], ['Shield', 'HD / Ultra HD'], ['Wifi', '4 Devices'], ['Download', 'Offline']] as const).map(([iconName, label]) => {
                  const icons: Record<string, JSX.Element> = {
                    Zap: <Zap size={14} className="text-[#e50914]" />,
                    Shield: <Shield size={14} className="text-[#e50914]" />,
                    Wifi: <Wifi size={14} className="text-[#e50914]" />,
                    Download: <Download size={14} className="text-[#e50914]" />,
                  };
                  return (
                    <span key={label} className="flex items-center gap-2">
                      {icons[iconName]} {label}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="flex-shrink-0 text-center">
              <Link to="/premium" className="inline-block bg-white text-black font-black px-10 py-4 rounded-2xl text-base hover:bg-gray-100 transition-all shadow-2xl hover:-translate-y-0.5">
                Get PlayMax+
              </Link>
              <p className="text-gray-600 text-xs mt-3">Starting from ₦2,000/week · Cancel anytime</p>
            </div>
          </div>
        </div>

        <div className="text-center pb-4 px-4">
          <p className="text-gray-700 text-xs">Made with care by <span className="text-gray-500 font-semibold">Damini × Nicky Tech</span></p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

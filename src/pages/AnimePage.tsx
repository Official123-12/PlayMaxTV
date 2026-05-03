import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import MovieCard from '@/components/features/MovieCard';
import AdBanner from '@/components/features/AdBanner';
import { searchMovies } from '@/lib/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const ANIME_SEARCHES = ['anime', 'naruto', 'dragon ball', 'one piece', 'attack on titan', 'demon slayer'];

// SVG icon for Anime (torii gate style)
const AnimeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="5" width="18" height="2.5" rx="1" fill="white" />
    <rect x="5.5" y="3" width="13" height="2" rx="1" fill="white" />
    <rect x="5" y="7.5" width="2" height="13" rx="1" fill="white" />
    <rect x="17" y="7.5" width="2" height="13" rx="1" fill="white" />
    <rect x="5" y="12" width="14" height="2" rx="1" fill="white" opacity="0.7" />
  </svg>
);

export default function AnimePage() {
  const [query, setQuery] = useState('anime');
  const [page, setPage] = useState('1');

  const { data, isLoading } = useQuery({
    queryKey: ['anime', query, page],
    queryFn: () => searchMovies(query, page),
    staleTime: 5 * 60 * 1000,
  });

  const items = data?.items || [];
  const currentPage = parseInt(page);

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <Navbar />
      <main className="pt-[68px] pb-12">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 py-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-600 to-pink-800 flex items-center justify-center shadow-lg">
              <AnimeIcon />
            </div>
            <div>
              <h1 className="text-white text-2xl font-black">Anime</h1>
              <p className="text-gray-600 text-sm">Japanese animation &amp; more</p>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6">
            {ANIME_SEARCHES.map(s => (
              <button key={s} onClick={() => { setQuery(s); setPage('1'); }}
                className={`flex-shrink-0 capitalize text-sm font-semibold px-4 py-2 rounded-xl border transition-all ${query === s ? 'bg-pink-600/20 border-pink-600/60 text-pink-400' : 'bg-[#1a1a1a] border-gray-800 text-gray-500 hover:text-white hover:border-gray-600'}`}>
                {s}
              </button>
            ))}
          </div>

          <AdBanner variant="leaderboard" />

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-4">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i}><div className="h-56 sm:h-72 skeleton rounded-xl" /><div className="h-3.5 skeleton rounded-lg mt-2.5 w-3/4" /></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-4">
              {items.map(m => <MovieCard key={m.subjectId} movie={m} />)}
            </div>
          )}

          {!isLoading && (
            <div className="flex items-center justify-center gap-4 mt-12">
              <button onClick={() => setPage(String(Math.max(1, currentPage - 1)))} disabled={currentPage <= 1}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1a1a1a] border border-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-semibold">
                <ChevronLeft size={16} /> Previous
              </button>
              <span className="text-gray-600 text-sm">Page {currentPage}</span>
              <button onClick={() => setPage(data?.pager?.nextPage || String(currentPage + 1))} disabled={!data?.pager?.hasMore}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#e50914] text-white hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-semibold">
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

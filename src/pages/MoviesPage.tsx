import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import MovieCard from '@/components/features/MovieCard';
import AdBanner from '@/components/features/AdBanner';
import { fetchBrowse } from '@/lib/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const FilmSVG = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="4" width="20" height="14" rx="2.5" stroke="white" strokeWidth="1.8"/>
    <path d="M8 4v14M16 4v14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M2 9h6M16 9h6M2 15h6M16 15h6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export default function MoviesPage() {
  const [page, setPage] = useState('1');

  const { data, isLoading } = useQuery({
    queryKey: ['movies', page],
    queryFn: () => fetchBrowse('movie', page),
    staleTime: 5 * 60 * 1000,
  });

  const movies = data?.items || [];
  const hasMore = data?.pager?.hasMore || false;
  const currentPage = parseInt(data?.pager?.page || '1');

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <Navbar />
      <main className="pt-[68px] pb-12">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 py-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg">
              <FilmSVG />
            </div>
            <div>
              <h1 className="text-white text-2xl font-black">Movies</h1>
              <p className="text-gray-600 text-sm">Browse thousands of movies</p>
            </div>
          </div>

          <AdBanner variant="leaderboard" />

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-4">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i}>
                  <div className="h-56 sm:h-72 skeleton rounded-xl" />
                  <div className="h-3.5 skeleton rounded-lg mt-2.5 w-3/4" />
                  <div className="h-2.5 skeleton rounded-lg mt-1.5 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-4">
              {movies.map(movie => (
                <MovieCard key={movie.subjectId} movie={movie} size="md" />
              ))}
            </div>
          )}

          {!isLoading && (
            <div className="flex items-center justify-center gap-4 mt-12">
              <button
                onClick={() => setPage(String(Math.max(1, currentPage - 1)))}
                disabled={currentPage <= 1}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1a1a1a] border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-semibold"
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span className="text-gray-600 text-sm font-medium">Page {currentPage}</span>
              <button
                onClick={() => setPage(data?.pager?.nextPage || String(currentPage + 1))}
                disabled={!hasMore}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#e50914] text-white hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-semibold"
              >
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

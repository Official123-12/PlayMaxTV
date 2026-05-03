import { useRef } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import type { Movie } from '@/types';
import MovieCard from './MovieCard';
import { Link } from 'react-router-dom';

interface CategoryRowProps {
  title: string;
  movies: Movie[];
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  viewAllPath?: string;
  accent?: string;
}

const SkeletonCard = ({ size }: { size: string }) => (
  <div className="flex-shrink-0 w-40 sm:w-48 lg:w-52">
    <div className={`${size === 'lg' ? 'h-64 sm:h-80' : 'h-56 sm:h-72'} rounded-xl skeleton`} />
    <div className="mt-2.5 h-3.5 skeleton rounded-lg w-4/5" />
    <div className="mt-1.5 h-2.5 skeleton rounded-lg w-1/2" />
  </div>
);

export default function CategoryRow({ title, movies, size = 'md', isLoading = false, viewAllPath, accent }: CategoryRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
    }
  };

  return (
    <section className="mb-10">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          {accent && <div className="w-1 h-6 rounded-full" style={{ background: accent }} />}
          <h2 className="text-white text-lg sm:text-xl font-black tracking-tight">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {viewAllPath && (
            <Link to={viewAllPath} className="text-xs text-gray-500 hover:text-[#e50914] transition-colors flex items-center gap-1 mr-2 font-medium">
              See all <ArrowRight size={12} />
            </Link>
          )}
          <button
            onClick={() => scroll('left')}
            className="w-9 h-9 rounded-xl bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 hover:border-gray-600 transition-all"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-9 h-9 rounded-xl bg-gray-800/80 border border-gray-700/50 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 hover:border-gray-600 transition-all"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide px-4 sm:px-6 lg:px-8 pb-4"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} size={size} />)
          : movies.map(movie => (
              <div key={movie.subjectId} style={{ scrollSnapAlign: 'start' }} className="w-40 sm:w-48 lg:w-52 flex-shrink-0">
                <MovieCard movie={movie} size={size} />
              </div>
            ))}
        {!isLoading && movies.length === 0 && (
          <p className="text-gray-700 text-sm py-8 italic">No content available</p>
        )}
      </div>
    </section>
  );
}

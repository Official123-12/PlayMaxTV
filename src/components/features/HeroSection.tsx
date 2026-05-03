import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Plus, Check, Star, Info } from 'lucide-react';
import type { Movie } from '@/types';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '@/lib/auth';

interface HeroSectionProps {
  movies: Movie[];
}

export default function HeroSection({ movies }: HeroSectionProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const navigate = useNavigate();

  const featured = movies.filter(m => m.stills?.url || m.cover?.url).slice(0, 6);
  const movie = featured[currentIdx];
  const [inList, setInList] = useState(false);

  useEffect(() => {
    if (movie) setInList(isInWatchlist(movie.subjectId));
  }, [movie]);

  useEffect(() => {
    if (featured.length <= 1) return;
    const timer = setInterval(() => setCurrentIdx(i => (i + 1) % featured.length), 7000);
    return () => clearInterval(timer);
  }, [featured.length]);

  if (!movie) return null;

  const backdropUrl = movie.stills?.url || movie.cover?.url;
  const rating = parseFloat(movie.imdbRatingValue);
  const hasRating = !isNaN(rating) && rating > 0;
  const genres = movie.genre?.split(',').slice(0, 3) || [];

  const handleWatch = () => navigate(`/watch/${movie.subjectId}?type=${movie.subjectType}&title=${encodeURIComponent(movie.title)}&cover=${encodeURIComponent(movie.cover?.url || '')}`);
  const handleWatchlist = () => {
    if (inList) { removeFromWatchlist(movie.subjectId); setInList(false); }
    else { addToWatchlist(movie.subjectId); setInList(true); }
  };

  return (
    <div className="relative w-full h-[60vh] sm:h-[68vh] lg:h-[86vh] overflow-hidden">
      {/* Backgrounds */}
      {featured.map((m, i) => (
        <div
          key={m.subjectId}
          className={`absolute inset-0 transition-opacity duration-1000 ${i === currentIdx ? 'opacity-100' : 'opacity-0'}`}
        >
          <img
            src={m.stills?.url || m.cover?.url}
            alt={m.title}
            className="w-full h-full object-cover object-top scale-105"
            style={{ filter: 'brightness(0.75)' }}
          />
        </div>
      ))}

      {/* Gradient layers */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0d0d0d]/80 via-[#0d0d0d]/20 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex items-end pb-16 sm:pb-20 px-4 sm:px-8 lg:px-14">
        <div className="max-w-2xl w-full fade-in-up">
          {/* Badges */}
          <div className="flex items-center flex-wrap gap-2 mb-3">
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${movie.subjectType === 1 ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'}`}>
              {movie.subjectType === 1 ? 'Movie' : 'Series'}
            </span>
            {hasRating && (
              <span className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-md">
                <Star size={12} fill="#f5c518" className="text-[#f5c518]" />
                <span className="text-[#f5c518] text-xs font-black">{rating.toFixed(1)}</span>
              </span>
            )}
            {movie.countryName && (
              <span className="text-xs text-gray-400 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-md">{movie.countryName}</span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-white text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black mb-3 leading-tight drop-shadow-2xl">
            {movie.title}
          </h1>

          {/* Genre dots */}
          {genres.length > 0 && (
            <div className="flex items-center gap-2 mb-5">
              {genres.map((g, i) => (
                <span key={g} className="flex items-center gap-2 text-gray-300 text-sm">
                  {i > 0 && <span className="w-1 h-1 rounded-full bg-gray-600" />}
                  {g.trim()}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleWatch}
              className="flex items-center gap-2.5 bg-white text-black font-black px-7 py-3 rounded-xl hover:bg-gray-100 transition-all active:scale-95 shadow-xl text-sm"
            >
              <Play size={18} fill="black" /> Watch Now
            </button>
            <button
              onClick={handleWatchlist}
              className="flex items-center gap-2.5 glass text-white font-bold px-6 py-3 rounded-xl hover:bg-white/15 transition-all text-sm"
            >
              {inList ? <><Check size={16} /> In My List</> : <><Plus size={16} /> My List</>}
            </button>
            <button
              onClick={handleWatch}
              className="flex items-center gap-2 glass text-white font-bold px-5 py-3 rounded-xl hover:bg-white/15 transition-all text-sm"
            >
              <Info size={16} /> Details
            </button>
          </div>
        </div>
      </div>

      {/* Slide indicators */}
      {featured.length > 1 && (
        <div className="absolute bottom-6 right-6 sm:right-10 flex gap-1.5">
          {featured.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIdx(i)}
              className={`rounded-full transition-all duration-300 ${i === currentIdx ? 'w-8 h-2 bg-[#e50914]' : 'w-2 h-2 bg-gray-600 hover:bg-gray-400'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

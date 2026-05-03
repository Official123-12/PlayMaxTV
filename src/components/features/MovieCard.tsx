import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Plus, Check, Star, Clock, Info } from 'lucide-react';
import type { Movie } from '@/types';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';

interface MovieCardProps {
  movie: Movie;
  size?: 'sm' | 'md' | 'lg';
}

function formatDuration(seconds: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function MovieCard({ movie, size = 'md' }: MovieCardProps) {
  const [imgError, setImgError] = useState(false);
  const [inList, setInList] = useState(() => isInWatchlist(movie.subjectId));
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();
  const { session } = useAuth();

  const typeLabel = movie.subjectType === 1 ? 'Movie' : movie.subjectType === 2 ? 'Series' : 'Video';
  const rating = parseFloat(movie.imdbRatingValue);
  const hasRating = !isNaN(rating) && rating > 0;

  const heightClass = size === 'sm' ? 'h-48 sm:h-56' : size === 'lg' ? 'h-64 sm:h-80' : 'h-56 sm:h-72';

  const handleWatchlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session) { navigate('/login'); return; }
    if (inList) { removeFromWatchlist(movie.subjectId); setInList(false); }
    else { addToWatchlist(movie.subjectId); setInList(true); }
  };

  const posterUrl = !imgError && movie.cover?.url
    ? movie.cover.url
    : `https://placehold.co/300x450/1a1a1a/444?text=${encodeURIComponent(movie.title.slice(0, 12))}`;

  const detailUrl = `/movie/${movie.subjectId}?type=${movie.subjectType}&title=${encodeURIComponent(movie.title)}&detailPath=${encodeURIComponent(movie.detailPath || '')}`;
  const watchUrl = `/watch/${movie.subjectId}?type=${movie.subjectType}&title=${encodeURIComponent(movie.title)}&cover=${encodeURIComponent(movie.cover?.url || '')}&detailPath=${encodeURIComponent(movie.detailPath || '')}`;

  return (
    <div
      className="relative flex-shrink-0 cursor-pointer group block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Poster */}
      <Link to={detailUrl} className={`relative ${heightClass} rounded-xl overflow-hidden bg-gray-900 block transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-red-900/30 group-hover:-translate-y-1`}>
        <img
          src={posterUrl}
          alt={movie.title}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent" />

        {/* Hover overlay */}
        <div className={`absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2.5 transition-opacity duration-200 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
          <Link to={watchUrl} onClick={e => e.stopPropagation()}
            className="w-13 h-13 rounded-full bg-[#e50914] flex items-center justify-center shadow-xl shadow-red-900/50 scale-90 group-hover:scale-100 transition-transform duration-200 w-14 h-14">
            <Play size={22} fill="white" className="text-white ml-1" />
          </Link>
          <Link to={detailUrl} onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 text-white text-xs font-semibold bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full hover:bg-white/25 transition-colors">
            <Info size={12} /> Details
          </Link>
        </div>

        {/* Type Badge */}
        <div className="absolute top-2.5 left-2.5">
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wide ${movie.subjectType === 1 ? 'bg-blue-600/90 text-white' : 'bg-purple-600/90 text-white'}`}>
            {typeLabel}
          </span>
        </div>

        {hasRating && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5 bg-black/80 backdrop-blur-sm rounded-lg px-2 py-0.5">
            <Star size={10} fill="#f5c518" className="text-[#f5c518]" />
            <span className="text-[11px] font-black text-[#f5c518]">{rating.toFixed(1)}</span>
          </div>
        )}

        <button
          onClick={handleWatchlistToggle}
          className={`absolute bottom-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
            inList ? 'bg-[#e50914] text-white opacity-100' : 'bg-black/70 backdrop-blur-sm text-gray-300 hover:text-white hover:bg-[#e50914]'
          } ${hovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
          aria-label={inList ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          {inList ? <Check size={14} /> : <Plus size={14} />}
        </button>

        {movie.duration > 0 && (
          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1">
            <Clock size={10} className="text-gray-300" />
            <span className="text-[10px] text-gray-300 font-medium">{formatDuration(movie.duration)}</span>
          </div>
        )}
      </Link>

      <div className="mt-2.5 px-0.5">
        <Link to={detailUrl}>
          <p className="text-white text-sm font-semibold line-clamp-2 group-hover:text-[#e50914] transition-colors leading-snug">
            {movie.title}
          </p>
        </Link>
        {movie.genre && (
          <p className="text-gray-600 text-[11px] mt-0.5 truncate">{movie.genre.split(',')[0]}</p>
        )}
      </div>
    </div>
  );
}

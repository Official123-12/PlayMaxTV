import { useState } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import MovieCard from '@/components/features/MovieCard';
import { searchMovies, fetchRecommended, fetchShowboxDetail } from '@/lib/api';
import { Play, Plus, Check, Star, Clock, Globe, Captions, Calendar, ArrowLeft, Film, Users } from 'lucide-react';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
import type { Movie } from '@/types';

function formatDuration(seconds: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

async function fetchMovieBySearch(id: string, title: string): Promise<Movie | null> {
  if (!title) return null;
  try {
    const res = await searchMovies(title.slice(0, 30), '1');
    return res.items.find(m => m.subjectId === id) || res.items[0] || null;
  } catch { return null; }
}

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session } = useAuth();

  const titleParam = searchParams.get('title') || '';
  const typeParam = parseInt(searchParams.get('type') || '1');
  const sbType = typeParam === 2 ? 'tv' : 'movie';

  const [inList, setInList] = useState(() => isInWatchlist(id || ''));
  const [imgError, setImgError] = useState(false);

  // Fetch XCASPER movie details
  const { data: movie, isLoading } = useQuery<Movie | null>({
    queryKey: ['movie-detail', id, titleParam],
    queryFn: () => fetchMovieBySearch(id!, titleParam),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch ShowBox detail (has actors, director, description, recommend)
  const { data: sbDetail } = useQuery({
    queryKey: ['showbox-detail', titleParam, sbType],
    queryFn: () => fetchShowboxDetail(titleParam, sbType),
    enabled: !!titleParam,
    staleTime: 15 * 60 * 1000,
  });

  // Fetch recommendations
  const { data: recommended = [] } = useQuery<Movie[]>({
    queryKey: ['recommended', id],
    queryFn: () => fetchRecommended(id!),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });

  const { data: fallbackRec = [] } = useQuery<Movie[]>({
    queryKey: ['rec-fallback', titleParam],
    queryFn: () => searchMovies(movie?.genre?.split(',')[0] || titleParam.split(' ')[0], '1')
      .then(r => r.items.filter(m => m.subjectId !== id).slice(0, 12)),
    enabled: !!movie && recommended.length === 0,
    staleTime: 10 * 60 * 1000,
  });

  const displayMovie = movie || {
    subjectId: id || '',
    subjectType: typeParam,
    title: titleParam,
    description: '',
    releaseDate: '',
    duration: 0,
    genre: '',
    cover: { url: '', width: 0, height: 0 },
    countryName: '',
    imdbRatingValue: '0',
    imdbRatingCount: 0,
    subtitles: '',
    hasResource: true,
    detailPath: '',
    staffList: [],
    stills: null,
  };

  // Merge ShowBox data over XCASPER data where richer
  const description = sbDetail?.description || displayMovie.description;
  const director = sbDetail?.director;
  const writer = sbDetail?.writer;
  const actorsString = sbDetail?.actors || '';
  const castList = actorsString ? actorsString.split(',').map(a => a.trim()).filter(Boolean).slice(0, 20) : [];
  const qualityTag = sbDetail?.quality_tag;
  const genres = (sbDetail?.cats || displayMovie.genre || '').split(',').map(g => g.trim()).filter(Boolean);
  const imdbRating = sbDetail?.imdb_rating || displayMovie.imdbRatingValue;
  const ratingNum = parseFloat(imdbRating || '0');
  const hasRating = !isNaN(ratingNum) && ratingNum > 0;

  const posterUrl = !imgError && displayMovie.cover?.url
    ? displayMovie.cover.url
    : `https://placehold.co/400x600/1a1a1a/444?text=${encodeURIComponent(displayMovie.title.slice(0, 12))}`;

  const recList = recommended.length > 0 ? recommended : fallbackRec;
  const typeLabel = displayMovie.subjectType === 1 ? 'Movie' : 'TV Series';
  const watchUrl = `/watch/${id}?type=${displayMovie.subjectType}&title=${encodeURIComponent(displayMovie.title)}&cover=${encodeURIComponent(displayMovie.cover?.url || '')}&detailPath=${encodeURIComponent(displayMovie.detailPath || '')}`;


  const handleWatchlist = () => {
    if (!session) { navigate('/login'); return; }
    if (inList) { removeFromWatchlist(id!); setInList(false); }
    else { addToWatchlist(id!); setInList(true); }
  };

  const subtitleList = displayMovie.subtitles ? displayMovie.subtitles.split(',').slice(0, 6) : [];

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <Navbar />
      <main className="pt-[68px] pb-12">
        {/* Hero backdrop */}
        <div className="relative overflow-hidden">
          {displayMovie.stills?.url && (
            <div className="absolute inset-0 h-[440px]">
              <img src={displayMovie.stills.url} alt="" className="w-full h-full object-cover opacity-20 blur-sm scale-105" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-[#0d0d0d]/80 to-[#0d0d0d]" />
            </div>
          )}

          <div className="relative max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10">
            <button onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 text-sm font-medium group">
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back
            </button>

            <div className="flex flex-col md:flex-row gap-8">
              {/* Poster */}
              <div className="flex-shrink-0 w-52 sm:w-64 mx-auto md:mx-0">
                {isLoading ? (
                  <div className="w-full h-96 skeleton rounded-2xl" />
                ) : (
                  <div className="relative group rounded-2xl overflow-hidden shadow-2xl shadow-black/60">
                    <img src={posterUrl} alt={displayMovie.title} onError={() => setImgError(true)}
                      className="w-full aspect-[2/3] object-cover" />
                    {qualityTag && (
                      <div className="absolute top-2 right-2">
                        <span className="bg-black/80 text-[#f5c518] text-[10px] font-black px-2 py-0.5 rounded-md uppercase">
                          {qualityTag.split(',')[0].trim()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                {isLoading ? (
                  <div className="space-y-3">
                    <div className="h-8 skeleton rounded-xl w-3/4" />
                    <div className="h-4 skeleton rounded-lg w-1/3" />
                    <div className="h-20 skeleton rounded-xl mt-4" />
                  </div>
                ) : (
                  <>
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className={`text-xs font-black px-2.5 py-1 rounded-lg uppercase ${displayMovie.subjectType === 1 ? 'bg-blue-600/80 text-white' : 'bg-purple-600/80 text-white'}`}>
                        {typeLabel}
                      </span>
                      {(displayMovie.releaseDate || sbDetail?.year) && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar size={11} /> {sbDetail?.year || displayMovie.releaseDate?.slice(0, 4)}
                        </span>
                      )}
                      {displayMovie.countryName && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Globe size={11} /> {displayMovie.countryName}
                        </span>
                      )}
                      {(displayMovie.duration > 0 || sbDetail?.runtime) && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock size={11} /> {formatDuration((sbDetail?.runtime || 0) * 60 || displayMovie.duration)}
                        </span>
                      )}
                      {sbDetail?.max_season && sbDetail.max_season > 1 && (
                        <span className="text-xs text-gray-400">{sbDetail.max_season} Seasons</span>
                      )}
                    </div>

                    <h1 className="text-white text-3xl sm:text-4xl font-black leading-tight mb-2">{displayMovie.title}</h1>

                    {/* IMDb Rating */}
                    {hasRating && (
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex items-center gap-1 bg-[#f5c518]/10 border border-[#f5c518]/30 rounded-lg px-2.5 py-1">
                          <Star size={13} fill="#f5c518" className="text-[#f5c518]" />
                          <span className="text-[#f5c518] font-black text-sm">{ratingNum.toFixed(1)}</span>
                          <span className="text-[#f5c518]/60 text-xs font-medium">IMDb</span>
                        </div>
                        {displayMovie.imdbRatingCount > 0 && (
                          <span className="text-gray-600 text-xs">{displayMovie.imdbRatingCount.toLocaleString()} ratings</span>
                        )}
                      </div>
                    )}

                    {/* Genres */}
                    {genres.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {genres.map(g => (
                          <span key={g} className="text-xs text-gray-300 bg-gray-800/80 border border-gray-700/50 px-3 py-1 rounded-full font-medium capitalize">
                            {g}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Director / Writer */}
                    {(director || writer) && (
                      <div className="flex flex-col gap-1 mb-4">
                        {director && (
                          <p className="text-gray-500 text-xs">
                            <span className="text-gray-400 font-semibold">Director: </span>{director}
                          </p>
                        )}
                        {writer && (
                          <p className="text-gray-500 text-xs">
                            <span className="text-gray-400 font-semibold">Writer: </span>
                            {writer.split(',').slice(0, 3).join(', ')}
                            {writer.split(',').length > 3 ? '...' : ''}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Description */}
                    {description ? (
                      <p className="text-gray-400 leading-relaxed text-sm mb-6 max-w-xl">{description}</p>
                    ) : displayMovie.postTitle ? (
                      <p className="text-gray-400 leading-relaxed text-sm mb-6 max-w-xl italic">"{displayMovie.postTitle}"</p>
                    ) : (
                      <p className="text-gray-700 text-sm mb-6 italic">No description available.</p>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-3 mb-6">
                      <Link to={watchUrl}
                        className="flex items-center gap-2.5 bg-[#e50914] hover:bg-red-700 text-white font-black px-7 py-3.5 rounded-xl shadow-lg shadow-red-900/30 transition-all hover:shadow-xl hover:-translate-y-0.5 text-sm">
                        <Play size={18} fill="white" /> Watch Now
                      </Link>
                      <button onClick={handleWatchlist}
                        className={`flex items-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm border transition-all ${inList ? 'bg-[#e50914]/10 border-[#e50914]/40 text-[#e50914]' : 'bg-[#1a1a1a] border-gray-700 text-gray-300 hover:text-white hover:border-gray-500'}`}>
                        {inList ? <Check size={16} /> : <Plus size={16} />}
                        {inList ? 'In Watchlist' : 'Add to Watchlist'}
                      </button>
                    </div>

                    {/* Subtitles */}
                    {subtitleList.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Captions size={13} className="text-gray-600 mt-0.5 flex-shrink-0" />
                        <p className="text-gray-600 text-xs">
                          <span className="text-gray-500 font-semibold">Subtitles: </span>
                          {subtitleList.join(', ')}{displayMovie.subtitles.split(',').length > 6 ? ` +${displayMovie.subtitles.split(',').length - 6} more` : ''}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ── Cast Section ─────────────────────────────────────────────── */}
            {castList.length > 0 && (
              <div className="mt-10">
                <h2 className="text-white font-black text-lg mb-5 flex items-center gap-2">
                  <Users size={17} className="text-[#e50914]" /> Cast
                </h2>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-3">
                  {castList.map((actor, i) => (
                    <div key={i} className="flex-shrink-0 w-24 text-center group">
                      <div className="w-16 h-16 mx-auto rounded-full overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 mb-2 flex items-center justify-center group-hover:border-[#e50914]/40 transition-colors">
                        <span className="text-gray-400 font-black text-xl group-hover:text-[#e50914] transition-colors">
                          {actor[0]?.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-300 text-xs font-semibold line-clamp-2 leading-tight group-hover:text-white transition-colors">{actor}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* XCASPER staff (if any) */}
            {!castList.length && displayMovie.staffList?.length > 0 && (
              <div className="mt-10">
                <h2 className="text-white font-black text-lg mb-4 flex items-center gap-2">
                  <Film size={17} className="text-gray-500" /> Cast
                </h2>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {displayMovie.staffList.map(staff => (
                    <div key={staff.staffId} className="flex-shrink-0 w-24 text-center">
                      <div className="w-16 h-16 mx-auto rounded-full overflow-hidden bg-gray-800 mb-2">
                        {staff.avatarUrl ? (
                          <img src={staff.avatarUrl} alt={staff.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold text-lg">
                            {staff.name[0]}
                          </div>
                        )}
                      </div>
                      <p className="text-white text-xs font-semibold line-clamp-2 leading-tight">{staff.name}</p>
                      {staff.character && <p className="text-gray-600 text-[10px] mt-0.5 truncate">{staff.character}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stills */}
        {displayMovie.stills?.url && (
          <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8 mb-10">
            <div className="rounded-2xl overflow-hidden border border-gray-800/50">
              <img src={displayMovie.stills.url} alt={displayMovie.title} className="w-full max-h-72 object-cover" />
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recList.length > 0 && (
          <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-white font-black text-xl mb-5 flex items-center gap-2">
              <div className="w-1 h-6 bg-[#e50914] rounded-full" />
              More Like This
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {recList.slice(0, 12).map(m => <MovieCard key={m.subjectId} movie={m} />)}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

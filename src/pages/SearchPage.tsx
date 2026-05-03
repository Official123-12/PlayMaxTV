import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import MovieCard from '@/components/features/MovieCard';
import { searchMovies, fetchBrowse } from '@/lib/api';
import { Search, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import { GENRES } from '@/constants';

const POPULAR_SEARCHES = ['Action movies', 'Korean drama', 'Anime 2024', 'Netflix series', 'Comedy', 'Horror', 'Sci-Fi', 'Romance', 'Thriller', 'Fantasy'];

const CONTENT_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv', label: 'TV Shows' },
];

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [input, setInput] = useState(query);
  const [page, setPage] = useState('1');
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [genreFilter, setGenreFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setInput(query);
    setPage('1');
  }, [query]);

  // Search results
  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ['search', query, page],
    queryFn: () => searchMovies(query, page),
    enabled: !!query,
    staleTime: 5 * 60 * 1000,
  });

  // Genre browse (when no search query but genre selected)
  const { data: browseData, isLoading: browseLoading } = useQuery({
    queryKey: ['search-genre', genreFilter],
    queryFn: () => searchMovies(genreFilter),
    enabled: !query && !!genreFilter,
    staleTime: 5 * 60 * 1000,
  });

  // Trending for empty state
  const { data: trendingData } = useQuery({
    queryKey: ['search-trending'],
    queryFn: () => fetchBrowse('movie'),
    enabled: !query && !genreFilter,
    staleTime: 10 * 60 * 1000,
  });

  const rawItems = query
    ? (searchData?.items || [])
    : genreFilter
    ? (browseData?.items || [])
    : (trendingData?.items || []);

  // Apply filters
  const filteredItems = rawItems.filter(m => {
    if (typeFilter === 'movie' && m.subjectType !== 1) return false;
    if (typeFilter === 'tv' && m.subjectType !== 2) return false;
    return true;
  });

  const isLoading = searchLoading || browseLoading;
  const hasMore = searchData?.pager?.hasMore || false;
  const currentPage = parseInt(page);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      setSearchParams({ q: input.trim() });
      setPage('1');
      setGenreFilter('');
    }
  };

  const clearFilters = () => {
    setTypeFilter('all');
    setGenreFilter('');
  };

  const activeFilterCount = [typeFilter !== 'all', !!genreFilter].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <Navbar />
      <main className="pt-20 pb-12">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">

          {/* Search bar */}
          <div className="max-w-2xl mx-auto mb-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Search movies, shows, anime..."
                  className="w-full bg-[#141414] border border-gray-700/60 text-white placeholder-gray-600 pl-11 pr-4 py-3.5 rounded-xl focus:outline-none focus:border-[#e50914] transition-colors text-sm"
                />
              </div>
              <button type="submit" className="bg-[#e50914] text-white px-6 py-3.5 rounded-xl font-bold hover:bg-red-700 transition-colors text-sm">
                Search
              </button>
            </form>

            {/* Popular searches */}
            {!query && !genreFilter && (
              <div className="mt-4">
                <p className="text-gray-600 text-xs mb-2 font-semibold uppercase tracking-wider">Popular Searches</p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SEARCHES.map(s => (
                    <button key={s} onClick={() => { setInput(s); setSearchParams({ q: s }); }}
                      className="text-xs text-gray-400 bg-[#1a1a1a] border border-gray-800/60 px-3 py-1.5 rounded-full hover:text-white hover:border-gray-600 transition-all">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Filter bar */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            {/* Type filters */}
            <div className="flex gap-1 bg-[#141414] border border-gray-800/40 p-1 rounded-xl">
              {CONTENT_TYPES.map(t => (
                <button key={t.value} onClick={() => setTypeFilter(t.value as 'all' | 'movie' | 'tv')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${typeFilter === t.value ? 'bg-[#e50914] text-white' : 'text-gray-500 hover:text-white'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Genre filter toggle */}
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${activeFilterCount > 0 ? 'border-[#e50914]/50 text-[#e50914] bg-[#e50914]/10' : 'border-gray-800 text-gray-500 hover:text-white bg-[#141414]'}`}>
              <Filter size={13} />
              Genres{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </button>

            {/* Active genre badge */}
            {genreFilter && (
              <button onClick={() => setGenreFilter('')}
                className="flex items-center gap-1.5 bg-blue-600/20 border border-blue-600/40 text-blue-400 px-3 py-1.5 rounded-xl text-xs font-bold">
                {genreFilter} <X size={12} />
              </button>
            )}

            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-gray-600 hover:text-gray-400 text-xs transition-colors ml-1">
                Clear all
              </button>
            )}

            {/* Results count */}
            {!isLoading && filteredItems.length > 0 && (
              <span className="text-gray-600 text-xs ml-auto">
                {filteredItems.length}{hasMore ? '+' : ''} result{filteredItems.length !== 1 ? 's' : ''}
                {query ? ` for "${query}"` : genreFilter ? ` in ${genreFilter}` : ' — Trending'}
              </span>
            )}
          </div>

          {/* Genre pills */}
          {showFilters && (
            <div className="bg-[#141414] border border-gray-800/40 rounded-2xl p-4 mb-6">
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-3">Filter by Genre</p>
              <div className="flex flex-wrap gap-2">
                {GENRES.map(g => (
                  <button key={g} onClick={() => { setGenreFilter(genreFilter === g ? '' : g); if (!query) setSearchParams({}); }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all font-semibold ${genreFilter === g ? 'bg-[#e50914] border-[#e50914] text-white' : 'border-gray-700/60 text-gray-400 hover:text-white hover:border-gray-500'}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i}>
                  <div className="h-56 sm:h-64 skeleton rounded-xl" />
                  <div className="h-3 skeleton rounded mt-2 w-3/4" />
                </div>
              ))}
            </div>
          ) : filteredItems.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredItems.map(movie => <MovieCard key={movie.subjectId} movie={movie} size="md" />)}
              </div>

              {/* Pagination (only for search results) */}
              {query && (
                <div className="flex items-center justify-center gap-4 mt-10">
                  <button onClick={() => setPage(String(Math.max(1, currentPage - 1)))} disabled={currentPage <= 1}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#141414] border border-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-semibold">
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <span className="text-gray-600 text-sm">Page {currentPage}</span>
                  <button onClick={() => setPage(searchData?.pager?.nextPage || String(currentPage + 1))} disabled={!hasMore}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e50914] text-white hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-semibold">
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          ) : (query || genreFilter) ? (
            <div className="text-center py-20">
              <Search size={52} className="text-gray-800 mx-auto mb-4" />
              <p className="text-gray-400 text-lg font-black">No results found</p>
              <p className="text-gray-600 text-sm mt-2">
                {typeFilter !== 'all' ? `No ${typeFilter === 'movie' ? 'movies' : 'TV shows'} found. Try "All" types.` : 'Try a different search term or genre.'}
              </p>
              {typeFilter !== 'all' && (
                <button onClick={() => setTypeFilter('all')} className="mt-3 text-[#e50914] text-sm font-bold hover:text-red-400">
                  Show all types
                </button>
              )}
            </div>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
}

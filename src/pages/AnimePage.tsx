import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AdBanner from '@/components/features/AdBanner';
import { ChevronLeft, ChevronRight, Play, Star, ExternalLink } from 'lucide-react';

const ANILIST_API = 'https://graphql.anilist.co';

const AnimeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="5" width="18" height="2.5" rx="1" fill="white" />
    <rect x="5.5" y="3" width="13" height="2" rx="1" fill="white" />
    <rect x="5" y="7.5" width="2" height="13" rx="1" fill="white" />
    <rect x="17" y="7.5" width="2" height="13" rx="1" fill="white" />
    <rect x="5" y="12" width="14" height="2" rx="1" fill="white" opacity="0.7" />
  </svg>
);

// ─── AniList anime result ─────────────────────────────────────────────────────
interface AniListMedia {
  id: number;
  title: { romaji: string; english: string | null };
  coverImage: { large: string; extraLarge: string };
  episodes: number | null;
  averageScore: number | null;
  genres: string[];
  status: string;
  season: string | null;
  seasonYear: number | null;
  format: string;
  description: string | null;
}

interface AniListPage {
  media: AniListMedia[];
  pageInfo: { hasNextPage: boolean; currentPage: number; total: number };
}

const GENRE_FILTERS = ['All', 'Action', 'Romance', 'Comedy', 'Fantasy', 'Horror', 'Thriller', 'Sports', 'Slice of Life', 'Mecha'];

async function fetchAniListAnime(genre: string, page: number): Promise<AniListPage> {
  const genreFilter = genre !== 'All' ? `genre_in: ["${genre}"]` : '';
  const query = `
    query {
      Page(page: ${page}, perPage: 24) {
        pageInfo { hasNextPage currentPage total }
        media(type: ANIME, sort: POPULARITY_DESC, status_not: NOT_YET_RELEASED ${genreFilter ? ', ' + genreFilter : ''}) {
          id
          title { romaji english }
          coverImage { large extraLarge }
          episodes
          averageScore
          genres
          status
          season
          seasonYear
          format
          description(asHtml: false)
        }
      }
    }
  `;

  const res = await fetch(ANILIST_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  return json.data.Page;
}

async function searchAniList(keyword: string, page: number): Promise<AniListPage> {
  const query = `
    query {
      Page(page: ${page}, perPage: 24) {
        pageInfo { hasNextPage currentPage total }
        media(type: ANIME, search: "${keyword.replace(/"/g, '')}", sort: POPULARITY_DESC) {
          id
          title { romaji english }
          coverImage { large extraLarge }
          episodes
          averageScore
          genres
          status
          season
          seasonYear
          format
          description(asHtml: false)
        }
      }
    }
  `;

  const res = await fetch(ANILIST_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  return json.data.Page;
}

function AnimeCard({ anime }: { anime: AniListMedia }) {
  const [imgError, setImgError] = useState(false);
  const title = anime.title.english || anime.title.romaji;
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
  const posterUrl = !imgError ? (anime.coverImage.extraLarge || anime.coverImage.large) : `https://placehold.co/300x450/1a1a1a/444?text=${encodeURIComponent(title.slice(0, 10))}`;

  // Watch URL: passes anilistId and isAnime flag
  const watchUrl = `/watch/${anime.id}?type=2&title=${encodeURIComponent(title)}&cover=${encodeURIComponent(posterUrl)}&isAnime=1&anilistId=${anime.id}`;

  return (
    <div className="relative flex-shrink-0 cursor-pointer group block">
      <Link to={watchUrl} className="relative h-56 sm:h-72 rounded-xl overflow-hidden bg-gray-900 block transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-pink-900/30 group-hover:-translate-y-1">
        <img
          src={posterUrl}
          alt={title}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent" />

        {/* Hover overlay */}
        <div className={`absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
          <div className="w-14 h-14 rounded-full bg-[#e50914] flex items-center justify-center shadow-xl shadow-red-900/50">
            <Play size={22} fill="white" className="text-white ml-1" />
          </div>
          <span className="text-white text-xs font-semibold bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full">Watch Now</span>
        </div>

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5">
          <span className="text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wide bg-pink-600/90 text-white">
            ANIME
          </span>
        </div>

        {score && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5 bg-black/80 backdrop-blur-sm rounded-lg px-2 py-0.5">
            <Star size={10} fill="#f5c518" className="text-[#f5c518]" />
            <span className="text-[11px] font-black text-[#f5c518]">{score}</span>
          </div>
        )}

        {anime.episodes && (
          <div className="absolute bottom-2.5 left-2.5">
            <span className="text-[10px] text-gray-300 font-medium">{anime.episodes} eps</span>
          </div>
        )}
      </Link>

      <div className="mt-2.5 px-0.5">
        <Link to={watchUrl}>
          <p className="text-white text-sm font-semibold line-clamp-2 group-hover:text-pink-400 transition-colors leading-snug">
            {title}
          </p>
        </Link>
        {anime.genres[0] && (
          <p className="text-gray-600 text-[11px] mt-0.5 truncate">{anime.genres.slice(0, 2).join(', ')}</p>
        )}
      </div>
    </div>
  );
}

export default function AnimePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [genre, setGenre] = useState('All');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['anilist-anime', searchQuery, genre, page],
    queryFn: () => searchQuery
      ? searchAniList(searchQuery, page)
      : fetchAniListAnime(genre, page),
    staleTime: 5 * 60 * 1000,
  });

  const items = data?.media || [];
  const hasMore = data?.pageInfo?.hasNextPage || false;
  const currentPage = data?.pageInfo?.currentPage || page;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(inputValue.trim());
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <Navbar />
      <main className="pt-[68px] pb-12">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="flex items-center gap-3 py-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-600 to-pink-800 flex items-center justify-center shadow-lg">
              <AnimeIcon />
            </div>
            <div>
              <h1 className="text-white text-2xl font-black">Anime</h1>
              <p className="text-gray-600 text-sm">Powered by AniList · Stream with 2anime.xyz</p>
            </div>
            <a href="https://anilist.co" target="_blank" rel="noreferrer"
              className="ml-auto flex items-center gap-1.5 text-xs text-gray-600 hover:text-pink-400 transition-colors">
              <ExternalLink size={11} /> AniList
            </a>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-2 mb-5">
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Search anime… (e.g. Naruto, Demon Slayer)"
              className="flex-1 bg-[#1a1a1a] border border-gray-800 text-white text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:border-pink-600 placeholder:text-gray-700 transition-colors"
            />
            <button type="submit"
              className="bg-pink-600 text-white px-5 py-2.5 rounded-xl text-sm font-black hover:bg-pink-700 transition-colors">
              Search
            </button>
            {searchQuery && (
              <button type="button" onClick={() => { setSearchQuery(''); setInputValue(''); setPage(1); }}
                className="border border-gray-700 text-gray-400 px-4 py-2.5 rounded-xl text-sm font-semibold hover:text-white transition-colors">
                Clear
              </button>
            )}
          </form>

          {/* Genre filter chips */}
          {!searchQuery && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6">
              {GENRE_FILTERS.map(g => (
                <button key={g} onClick={() => { setGenre(g); setPage(1); }}
                  className={`flex-shrink-0 capitalize text-sm font-semibold px-4 py-2 rounded-xl border transition-all ${genre === g ? 'bg-pink-600/20 border-pink-600/60 text-pink-400' : 'bg-[#1a1a1a] border-gray-800 text-gray-500 hover:text-white hover:border-gray-600'}`}>
                  {g}
                </button>
              ))}
            </div>
          )}

          <AdBanner variant="leaderboard" />

          {/* Note about streaming */}
          <div className="bg-pink-950/20 border border-pink-800/30 rounded-xl px-4 py-2.5 flex items-center gap-2 mb-4 mt-4">
            <span className="text-pink-400 text-lg">🌸</span>
            <p className="text-pink-300/80 text-xs font-semibold">
              Click any anime to watch it. Uses 2anime.xyz embed by default.
              Install <a href="https://ublockorigin.com" target="_blank" rel="noreferrer" className="underline text-pink-400 hover:text-pink-300">uBlock Origin</a> for ad-free streaming.
            </p>
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-4">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i}>
                  <div className="h-56 sm:h-72 skeleton rounded-xl" />
                  <div className="h-3.5 skeleton rounded-lg mt-2.5 w-3/4" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-600 text-sm">No anime found. Try a different search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-4">
              {items.map(anime => <AnimeCard key={anime.id} anime={anime} />)}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && (
            <div className="flex items-center justify-center gap-4 mt-12">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1a1a1a] border border-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-semibold">
                <ChevronLeft size={16} /> Previous
              </button>
              <span className="text-gray-600 text-sm">Page {currentPage}</span>
              <button onClick={() => setPage(page + 1)} disabled={!hasMore}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-semibold">
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

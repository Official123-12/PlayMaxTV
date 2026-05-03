import { MOVIE_API_BASE } from '@/constants';
import type { Movie, StreamResponse, StreamQuality } from '@/types';

const SB_BASE = MOVIE_API_BASE; // https://movieapi.xcasper.space/api

interface BrowseResponse {
  code: number;
  success: boolean;
  data: {
    pager: { hasMore: boolean; nextPage: string; page: string; perPage: number; totalCount: number };
    items: Movie[];
  };
}

interface TrendingResponse {
  code: number;
  success: boolean;
  data: { subjectList: Movie[] };
}

interface SearchResponse {
  code: number;
  success: boolean;
  data: {
    pager: { hasMore: boolean; nextPage: string; page: string };
    items: Movie[];
  };
}

export interface Episode {
  id: string;         // ShowBox episode ID (numeric string)
  showboxId?: number; // ShowBox show ID
  name: string;
  title?: string;
  episode: number;
  season: number;
  duration?: number;
  cover?: string;
  airDate?: string;
  synopsis?: string;
}

export interface SeasonData {
  season: number;
  episodes: Episode[];
}

// ─── ShowBox search result ────────────────────────────────────────────────────
interface ShowboxResult {
  id: number;
  box_type: number; // 1=movie, 2=tv
  title: string;
  description?: string;
  poster?: string;
  imdb_rating?: string;
  year?: number;
  last_episode?: { season: number; episode: number };
}

// Cache showbox IDs to avoid repeated searches
const showboxIdCache = new Map<string, number>();

/**
 * Step 1: Find ShowBox ID by searching with the movie/show title.
 * The /api/stream endpoint needs ShowBox IDs (small integers), NOT XCASPER IDs.
 */
async function findShowboxId(title: string, type: 'movie' | 'tv'): Promise<number | null> {
  const cacheKey = `${type}:${title.toLowerCase()}`;
  if (showboxIdCache.has(cacheKey)) return showboxIdCache.get(cacheKey)!;

  try {
    // Try up to 3 keywords (title, first word, first two words)
    const keywords = [
      title,
      title.split(' ').slice(0, 3).join(' '),
      title.split(' ')[0],
    ].filter((k, i, arr) => k && arr.indexOf(k) === i);

    for (const keyword of keywords) {
      const url = `${SB_BASE}/showbox/search?keyword=${encodeURIComponent(keyword)}&type=${type}`;
      console.log('[ShowBox Search]', url);
      const res = await fetch(url);
      const json = await res.json();
      console.log('[ShowBox Search Result]', JSON.stringify(json).slice(0, 300));

      const items: ShowboxResult[] = json.data || [];
      if (!Array.isArray(items) || items.length === 0) continue;

      // Find best match: exact title first, then first result
      const titleLower = title.toLowerCase();
      const match =
        items.find(i => i.title.toLowerCase() === titleLower) ||
        items.find(i => titleLower.includes(i.title.toLowerCase()) || i.title.toLowerCase().includes(titleLower)) ||
        items[0];

      if (match?.id) {
        showboxIdCache.set(cacheKey, match.id);
        console.log('[ShowBox Match]', match.title, '→ id:', match.id);
        return match.id;
      }
    }
  } catch (e) {
    console.error('[findShowboxId] error:', e);
  }
  return null;
}

// ─── Pick best stream from API response ────────────────────────────────────────
/**
 * Extracts the best proxyUrl from the stream API response.
 * Priority: 1080p → 720p → 480p → 360p → first available
 */
export function pickBestStream(response: unknown): StreamQuality | null {
  const tryExtract = (obj: unknown): StreamQuality[] => {
    if (!obj || typeof obj !== 'object') return [];
    const o = obj as Record<string, unknown>;

    // Direct streams array
    if (Array.isArray(o.streams)) {
      const valid = (o.streams as StreamQuality[]).filter(s => s?.proxyUrl);
      if (valid.length > 0) return valid;
    }
    // data.streams
    if (o.data && typeof o.data === 'object') {
      const nested = tryExtract(o.data);
      if (nested.length > 0) return nested;
    }
    // Object with proxyUrl directly
    if (typeof o.proxyUrl === 'string' && o.proxyUrl) return [o as StreamQuality];
    // Search all values recursively
    for (const val of Object.values(o)) {
      if (val && typeof val === 'object') {
        const found = tryExtract(val);
        if (found.length > 0) return found;
      }
    }
    return [];
  };

  const streams = tryExtract(response);
  if (streams.length === 0) return null;

  const prefer = (res: string) => streams.find(s => String(s.resolutions || s.quality || '') === res);
  return prefer('1080') || prefer('720') || prefer('480') || prefer('360') || streams[0];
}

// ─── Core stream fetcher — the correct approach ──────────────────────────────
/**
 * Fetches a playable stream for a movie/show.
 *
 * CRITICAL: The /api/stream endpoint uses ShowBox IDs (small integers like 3737),
 * NOT XCASPER subject IDs (large numbers like 6211074368500812936).
 *
 * Flow:
 *   1. Search ShowBox catalog by title to get ShowBox ID
 *   2. Fetch stream URL using ShowBox ID
 *   3. For TV: pass season & episode numbers
 */
// NOTE: fetchStreamForId is kept for fallback but WatchPage now uses the edge function 'stream-proxy'
export async function fetchStreamForId(
  xcasperId: string,
  type: string = 'movie',
  episodeId?: string,
  title?: string,
  episodeNum?: number,
  seasonNum?: number
): Promise<StreamQuality | null> {
  const sbType = type === '2' || type === 'tv' ? 'tv' : 'movie';
  console.log('[fetchStreamForId]', { xcasperId, sbType, title, episodeNum, seasonNum });

  // Step 1: Get ShowBox ID via search
  let showboxId: number | null = null;
  if (title) {
    showboxId = await findShowboxId(title, sbType);
  }

  // Step 2: Build stream URLs
  const tryUrls: string[] = [];

  if (showboxId) {
    if (sbType === 'tv' && seasonNum !== undefined && episodeNum !== undefined) {
      // TV episode with season & episode
      tryUrls.push(`${SB_BASE}/stream?id=${showboxId}&type=tv&season=${seasonNum}&episode=${episodeNum}`);
      tryUrls.push(`${SB_BASE}/showbox/streams?id=${showboxId}&type=tv&season=${seasonNum}&episode=${episodeNum}`);
    } else if (sbType === 'tv') {
      // TV show default to S1E1
      tryUrls.push(`${SB_BASE}/stream?id=${showboxId}&type=tv&season=1&episode=1`);
      tryUrls.push(`${SB_BASE}/showbox/streams?id=${showboxId}&type=tv`);
    } else {
      // Movie
      tryUrls.push(`${SB_BASE}/stream?id=${showboxId}&type=movie`);
      tryUrls.push(`${SB_BASE}/showbox/streams?id=${showboxId}&type=movie`);
      tryUrls.push(`${SB_BASE}/bff/stream?id=${showboxId}&type=movie`);
      tryUrls.push(`${SB_BASE}/play?id=${showboxId}&type=movie`);
    }
  }

  // Also try with XCASPER ID as fallback (in case API accepts both)
  if (sbType === 'movie') {
    tryUrls.push(`${SB_BASE}/stream?id=${xcasperId}&type=movie`);
    tryUrls.push(`${SB_BASE}/bff/stream?id=${xcasperId}&type=movie`);
    tryUrls.push(`${SB_BASE}/play?id=${xcasperId}&type=movie`);
  } else if (seasonNum !== undefined && episodeNum !== undefined) {
    tryUrls.push(`${SB_BASE}/stream?id=${xcasperId}&type=tv&season=${seasonNum}&episode=${episodeNum}`);
  } else {
    tryUrls.push(`${SB_BASE}/stream?id=${xcasperId}&type=tv&season=1&episode=1`);
  }

  for (const url of tryUrls) {
    try {
      console.log('[Stream] Trying:', url);
      const res = await fetch(url);

      if (!res.ok) {
        console.warn('[Stream] HTTP', res.status, url);
        continue;
      }

      const text = await res.text();
      if (!text || text.trim() === '[]' || text.trim() === 'null' || text.trim() === '{}') {
        console.warn('[Stream] Empty response from:', url);
        continue;
      }

      let json: unknown;
      try { json = JSON.parse(text); } catch { continue; }
      console.log('[Stream] Response:', JSON.stringify(json).slice(0, 400));

      const stream = pickBestStream(json);
      if (stream?.proxyUrl) {
        console.log('[Stream] ✅ Found proxyUrl:', stream.proxyUrl.slice(0, 80), '| res:', stream.resolutions);
        return stream;
      }
    } catch (e) {
      console.error('[Stream] Failed:', url, e);
    }
  }

  console.warn('[Stream] ❌ No stream found for', xcasperId, title);
  return null;
}

// ─── Fetch ShowBox TV episodes for a show ────────────────────────────────────
export async function fetchEpisodes(xcasperId: string, title?: string, season?: number): Promise<SeasonData[]> {
  try {
    // Find ShowBox ID first
    let showboxId: number | null = null;
    if (title) showboxId = await findShowboxId(title, 'tv');

    const id = showboxId || xcasperId;
    const url = `${SB_BASE}/showbox/tv?id=${id}`;
    console.log('[fetchEpisodes]', url);

    const res = await fetch(url);
    const json = await res.json();
    console.log('[fetchEpisodes] response:', JSON.stringify(json).slice(0, 300));

    // ShowBox TV response: json.data.episode[] with {id, season, episode, title, thumbs, synopsis, runtime}
    const data = json.data || json;
    const episodeList: Record<string, unknown>[] = data.episode || data.episodes || [];
    const seasons: number[] = data.season || data.years || [1];

    if (!Array.isArray(episodeList) || episodeList.length === 0) return [];

    // Group by season
    const seasonMap = new Map<number, Episode[]>();
    for (const ep of episodeList) {
      const s = Number(ep.season || 1);
      if (season !== undefined && s !== season) continue;
      const episodeObj: Episode = {
        id: String(ep.id),
        showboxId: showboxId || undefined,
        name: String(ep.title || `Episode ${ep.episode}`),
        episode: Number(ep.episode || 0),
        season: s,
        duration: Number(ep.runtime || 0),
        cover: String(ep.thumbs || ep.thumbs_org || ''),
        airDate: String(ep.released || ''),
        synopsis: String(ep.synopsis || ''),
      };
      if (!seasonMap.has(s)) seasonMap.set(s, []);
      seasonMap.get(s)!.push(episodeObj);
    }

    // Sort seasons and episodes
    const result: SeasonData[] = Array.from(seasonMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([s, eps]) => ({
        season: s,
        episodes: eps.sort((a, b) => a.episode - b.episode),
      }));

    // If no episodes from ShowBox TV endpoint, try generic episode API
    if (result.length === 0) {
      const epUrl = season
        ? `${SB_BASE}/episodes?id=${xcasperId}&season=${season}`
        : `${SB_BASE}/episodes?id=${xcasperId}`;
      const epRes = await fetch(epUrl);
      const epJson = await epRes.json();
      if (epJson.data?.episodes && Array.isArray(epJson.data.episodes)) {
        return [{ season: season || 1, episodes: (epJson.data.episodes as Record<string, unknown>[]).map((e, i) => ({
          id: String(e.id || i),
          name: String(e.name || e.title || `Episode ${i + 1}`),
          episode: Number(e.episode || i + 1),
          season: Number(e.season || season || 1),
          duration: Number(e.duration || 0),
          cover: String(e.cover || e.thumbnail || ''),
          airDate: String(e.airDate || ''),
        })) }];
      }
    }

    return result;
  } catch (err) {
    console.error('[fetchEpisodes] error:', err);
    return [];
  }
}

// ─── Standard API calls ───────────────────────────────────────────────────────
export async function fetchTrending(): Promise<Movie[]> {
  try {
    const res = await fetch(`${SB_BASE}/trending`);
    const json: TrendingResponse = await res.json();
    return json.data?.subjectList || [];
  } catch (err) { console.error('fetchTrending error:', err); return []; }
}

export async function fetchBrowse(category: string = 'movie', page: string = '1'): Promise<BrowseResponse['data']> {
  try {
    const res = await fetch(`${SB_BASE}/browse?category=${category}&page=${page}`);
    const json: BrowseResponse = await res.json();
    return json.data || { pager: { hasMore: false, nextPage: '1', page: '1', perPage: 24, totalCount: 0 }, items: [] };
  } catch (err) { console.error('fetchBrowse error:', err); return { pager: { hasMore: false, nextPage: '1', page: '1', perPage: 24, totalCount: 0 }, items: [] }; }
}

export async function searchMovies(keyword: string, page: string = '1'): Promise<SearchResponse['data']> {
  try {
    const res = await fetch(`${SB_BASE}/search?keyword=${encodeURIComponent(keyword)}&page=${page}`);
    const json: SearchResponse = await res.json();
    return json.data || { pager: { hasMore: false, nextPage: '1', page: '1' }, items: [] };
  } catch (err) { console.error('searchMovies error:', err); return { pager: { hasMore: false, nextPage: '1', page: '1' }, items: [] }; }
}

export async function fetchHot(): Promise<Movie[]> {
  try {
    const res = await fetch(`${SB_BASE}/hot`);
    const json: TrendingResponse = await res.json();
    return json.data?.subjectList || [];
  } catch (err) { console.error('fetchHot error:', err); return []; }
}

export async function fetchMovieDetail(id: string): Promise<Movie | null> {
  try {
    const res = await fetch(`${SB_BASE}/rich-detail?id=${id}`);
    const json = await res.json();
    return json.data || null;
  } catch (err) { console.error('fetchMovieDetail error:', err); return null; }
}

export async function fetchRecommended(id: string): Promise<Movie[]> {
  try {
    const res = await fetch(`${SB_BASE}/recommend?id=${id}`);
    const json = await res.json();
    return json.data?.subjectList || json.data?.items || [];
  } catch { return []; }
}

export async function fetchSearchSuggest(keyword: string): Promise<string[]> {
  try {
    const res = await fetch(`${SB_BASE}/search/suggest?keyword=${encodeURIComponent(keyword)}`);
    const json = await res.json();
    if (Array.isArray(json.data)) {
      return json.data.map((item: unknown) =>
        typeof item === 'string' ? item : (item as { keyword?: string; title?: string })?.keyword || (item as { title?: string })?.title || ''
      ).filter(Boolean).slice(0, 6);
    }
    return [];
  } catch { return []; }
}

// ─── ShowBox Movie/TV detail (has cast, description, etc.) ──────────────────
export interface ShowboxDetail {
  id: number;
  title: string;
  description?: string;
  director?: string;
  writer?: string;
  actors?: string; // comma-separated actor names
  poster?: string;
  imdb_rating?: string;
  cats?: string;
  year?: number;
  runtime?: number;
  quality_tag?: string;
  max_season?: number;
  max_episode?: number;
  season?: number[];
  episode?: unknown[];
  recommend?: Array<{ mid: number; title: string; poster?: string; poster_min?: string; imdb_rating?: string; year?: number; cats?: string }>;
}

const showboxDetailCache = new Map<string, ShowboxDetail>();

export async function fetchShowboxDetail(title: string, type: 'movie' | 'tv'): Promise<ShowboxDetail | null> {
  const cacheKey = `${type}:${title.toLowerCase()}`;
  if (showboxDetailCache.has(cacheKey)) return showboxDetailCache.get(cacheKey)!;

  try {
    // Step 1: search to get ShowBox ID
    const sbId = await findShowboxId(title, type);
    if (!sbId) return null;

    // Step 2: fetch ShowBox detail
    const url = `${SB_BASE}/showbox/${type}?id=${sbId}`;
    console.log('[fetchShowboxDetail]', url);
    const res = await fetch(url);
    const json = await res.json();
    const detail: ShowboxDetail = json.data || {};
    if (detail.id) {
      showboxDetailCache.set(cacheKey, detail);
      return detail;
    }
    return null;
  } catch (e) {
    console.error('[fetchShowboxDetail] error:', e);
    return null;
  }
}

// ─── Legacy compat ────────────────────────────────────────────────────────────
export async function fetchStreamUrl(id: string, type: string = 'movie'): Promise<StreamResponse> {
  try {
    const res = await fetch(`${SB_BASE}/showbox/streams?id=${id}&type=${type}`);
    return await res.json();
  } catch { return {}; }
}

export async function fetchStreamFallback(id: string, type: string = 'movie'): Promise<StreamResponse> {
  try {
    const res = await fetch(`${SB_BASE}/stream?id=${id}&type=${type}`);
    return await res.json();
  } catch { return {}; }
}

export function buildEmbedUrl(id: string, type: string = 'movie'): string {
  return `${SB_BASE}/embed?id=${id}&type=${type}`;
}

// ─── NewToxic Downloads (free MP4 downloads) ─────────────────────────────────
export interface DownloadFile {
  id: string;
  title: string;
  size?: string;
  quality?: string;
  format?: string;
  downloadUrl: string;
}

export async function fetchDownloadLinks(title: string): Promise<DownloadFile[]> {
  try {
    // Search NewToxic for the title
    const searchRes = await fetch(`${SB_BASE}/newtoxic/search?keyword=${encodeURIComponent(title)}`);
    const searchJson = await searchRes.json();
    const items = searchJson.data || [];
    if (!Array.isArray(items) || items.length === 0) return [];

    const first = items[0] as { id?: string; slug?: string };
    const slug = first?.slug || first?.id;
    if (!slug) return [];

    // Get files for first result
    const filesRes = await fetch(`${SB_BASE}/newtoxic/files?id=${slug}`);
    const filesJson = await filesRes.json();
    const files = filesJson.data || [];
    if (!Array.isArray(files)) return [];

    return (files as Record<string, unknown>[]).map((f, i) => ({
      id: String(f.id || i),
      title: String(f.title || f.name || `File ${i + 1}`),
      size: String(f.size || ''),
      quality: String(f.quality || f.resolution || ''),
      format: String(f.format || f.ext || 'mp4'),
      downloadUrl: String(f.url || f.download_url || f.link || ''),
    })).filter(f => f.downloadUrl);
  } catch (e) {
    console.error('[fetchDownloadLinks] error:', e);
    return [];
  }
}

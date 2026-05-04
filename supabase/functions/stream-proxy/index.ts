import { corsHeaders } from '../_shared/cors.ts';

const SB_BASE = 'https://movieapi.xcasper.space/api';
const OMEGA_BASE = 'https://omegatech-api.dixonomega.tech/api/movie';

const BH: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://movieapi.xcasper.space/',
  'Origin': 'https://movieapi.xcasper.space',
};

interface StreamObj {
  quality: string;
  resolutions: string;
  proxyUrl: string;
  downloadUrl: string;
  url?: string;
}

interface SubtitleObj {
  language: string;
  languageCode: string;
  url: string;
}

interface AudioTrackObj {
  language: string;
  languageCode: string;
  isOriginal: boolean;
  subjectId: string;
  detailPath?: string;
}

/**
 * Call /api/play?subjectId=ID — returns streams, subtitles, audioTracks.
 * This is the CORRECT endpoint for getting playable stream URLs.
 */
async function fetchPlayEndpoint(subjectId: string): Promise<{
  streams: StreamObj[];
  subtitles: SubtitleObj[];
  audioTracks: AudioTrackObj[];
} | null> {
  try {
    const url = `${SB_BASE}/play?subjectId=${subjectId}`;
    console.log('[stream-proxy] Calling /api/play:', url);
    const r = await fetch(url, { headers: BH });
    if (!r.ok) {
      console.warn('[stream-proxy] /api/play returned', r.status);
      return null;
    }
    const json = await r.json();
    const data = json.data || json;

    const streams: StreamObj[] = (data.streams || [])
      .filter((s: Record<string, unknown>) => s.proxyUrl || s.url)
      .map((s: Record<string, unknown>) => ({
        quality: String(s.resolutions || s.resolution || ''),
        resolutions: String(s.resolutions || s.resolution || ''),
        proxyUrl: String(s.proxyUrl || ''),
        downloadUrl: String(s.downloadUrl || s.proxyUrl || ''),
        url: String(s.url || ''),
      }));

    const subtitles: SubtitleObj[] = (data.subtitles || [])
      .filter((s: Record<string, unknown>) => s.url)
      .map((s: Record<string, unknown>) => ({
        language: String(s.language || ''),
        languageCode: String(s.languageCode || ''),
        url: String(s.url || ''),
      }));

    const audioTracks: AudioTrackObj[] = (data.audioTracks || [])
      .filter((a: Record<string, unknown>) => a.subjectId)
      .map((a: Record<string, unknown>) => ({
        language: String(a.language || ''),
        languageCode: String(a.languageCode || ''),
        isOriginal: Boolean(a.isOriginal),
        subjectId: String(a.subjectId || ''),
        detailPath: a.detailPath ? String(a.detailPath) : undefined,
      }));

    console.log('[stream-proxy] /api/play streams:', streams.length, '| subtitles:', subtitles.length, '| audio:', audioTracks.length);
    return { streams, subtitles, audioTracks };
  } catch (e) {
    console.error('[stream-proxy] /api/play error:', e);
    return null;
  }
}

/**
 * Build bff/stream URLs as fallback when /api/play fails or returns empty.
 * Format: /api/bff/stream?subjectId=ID&resolution=720
 * For TV episodes with season/episode: /api/bff/stream?subjectId=ID&season=S&episode=E&resolution=720
 */
function buildBffStreams(subjectId: string, season?: number, episode?: number): StreamObj[] {
  const resolutions = ['1080', '720', '480', '360'];
  const baseParams = season !== undefined && episode !== undefined
    ? `subjectId=${subjectId}&season=${season}&episode=${episode}`
    : `subjectId=${subjectId}`;

  return resolutions.map(res => ({
    quality: `${res}p`,
    resolutions: res,
    proxyUrl: `${SB_BASE}/bff/stream?${baseParams}&resolution=${res}`,
    downloadUrl: `${SB_BASE}/bff/stream?${baseParams}&resolution=${res}&download=1`,
  }));
}

/**
 * Omega fallback for TV series sources (when episode subjectId not available).
 */
async function tryOmegaSeries(
  xcasperId: string,
  season: number,
  episode: number,
  detailPath?: string
): Promise<StreamObj[] | null> {
  try {
    const path = detailPath ? encodeURIComponent(detailPath) : '';
    const url = `${OMEGA_BASE}/moviebox-series-sources?id=${xcasperId}&season=${season}&episode=${episode}&path=${path}`;
    console.log('[omega] Trying:', url);
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });
    if (!r.ok) return null;
    const json = await r.json();

    const streams: StreamObj[] = [];
    const walk = (obj: unknown): void => {
      if (!obj || typeof obj !== 'object') return;
      const o = obj as Record<string, unknown>;
      if (typeof o.url === 'string' && o.url.startsWith('http')) {
        const q = String(o.quality || o.resolution || '480');
        streams.push({
          quality: q,
          resolutions: q.replace(/[^0-9]/g, ''),
          proxyUrl: o.url,
          downloadUrl: o.url,
        });
        return;
      }
      if (Array.isArray(obj)) { obj.forEach(walk); return; }
      Object.values(o).forEach(walk);
    };
    walk(json);
    return streams.length > 0 ? streams : null;
  } catch (e) {
    console.warn('[omega] Error:', e);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const xcasperId: string = String(body.id || body.subjectId || '');
    const episodeSubjectId: string = String(body.episodeSubjectId || '');
    const type: string = body.type || 'movie';
    const season: number = Number(body.season) || 1;
    const episode: number = Number(body.episode) || 1;
    const title: string = body.title || '';
    const detailPath: string = body.detailPath || '';

    console.log('[stream-proxy] Request:', { xcasperId, episodeSubjectId, type, season, episode, title });

    if (!xcasperId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing subjectId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── MOVIE: call /api/play directly with show subjectId ────────────────────
    if (type === 'movie') {
      const playResult = await fetchPlayEndpoint(xcasperId);
      if (playResult && playResult.streams.length > 0) {
        return new Response(
          JSON.stringify({
            success: true,
            streams: playResult.streams,
            stream: playResult.streams.find(s => s.resolutions === '720') || playResult.streams[0],
            subtitles: playResult.subtitles,
            audioTracks: playResult.audioTracks,
            xcasperId,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fallback: build bff/stream URLs
      const fallbackStreams = buildBffStreams(xcasperId);
      return new Response(
        JSON.stringify({ success: true, streams: fallbackStreams, stream: fallbackStreams[1] || fallbackStreams[0], subtitles: [], audioTracks: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── TV EPISODE: use episode-level subjectId if provided ───────────────────
    if (episodeSubjectId) {
      const playResult = await fetchPlayEndpoint(episodeSubjectId);
      if (playResult && playResult.streams.length > 0) {
        return new Response(
          JSON.stringify({
            success: true,
            streams: playResult.streams,
            stream: playResult.streams.find(s => s.resolutions === '720') || playResult.streams[0],
            subtitles: playResult.subtitles,
            audioTracks: playResult.audioTracks,
            xcasperId: episodeSubjectId,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ── TV FALLBACK 1: bff/stream with season+episode params ─────────────────
    const bffStreams = buildBffStreams(xcasperId, season, episode);

    // ── TV FALLBACK 2: Omega series sources ───────────────────────────────────
    const omegaStreams = await tryOmegaSeries(xcasperId, season, episode, detailPath);
    if (omegaStreams && omegaStreams.length > 0) {
      // Also get subtitles from show-level /api/play
      const showPlay = await fetchPlayEndpoint(xcasperId);
      return new Response(
        JSON.stringify({
          success: true,
          streams: omegaStreams,
          stream: omegaStreams[0],
          subtitles: showPlay?.subtitles || [],
          audioTracks: showPlay?.audioTracks || [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get subtitles from show-level /api/play
    const showPlay = await fetchPlayEndpoint(xcasperId);

    return new Response(
      JSON.stringify({
        success: true,
        streams: bffStreams,
        stream: bffStreams.find(s => s.resolutions === '720') || bffStreams[0],
        subtitles: showPlay?.subtitles || [],
        audioTracks: showPlay?.audioTracks || [],
        xcasperId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (e) {
    console.error('[stream-proxy] Fatal error:', e);

    try {
      const body = await req.clone().json().catch(() => ({}));
      const xcasperId: string = String(body?.id || body?.subjectId || '');
      if (xcasperId) {
        const fallbackStreams = buildBffStreams(xcasperId);
        return new Response(
          JSON.stringify({ success: true, streams: fallbackStreams, stream: fallbackStreams[1] || fallbackStreams[0] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch { /* ignore */ }

    return new Response(
      JSON.stringify({ success: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

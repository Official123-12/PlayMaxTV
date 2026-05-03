import { corsHeaders } from '../_shared/cors.ts';

const SB_BASE = 'https://movieapi.xcasper.space/api';
const OMEGA_BASE = 'https://omegatech-api.dixonomega.tech/api/movie';

const BH = {
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
}

/**
 * Build the 4 quality stream URLs directly from XCASPER subjectId.
 * Format: https://movieapi.xcasper.space/api/bff/stream?subjectId=ID&resolution=720
 * These URLs serve video bytes directly in the browser <video> element.
 */
function buildXcasperStreams(subjectId: string): StreamObj[] {
  const resolutions = ['1080', '720', '480', '360'];
  return resolutions.map(res => ({
    quality: `${res}p`,
    resolutions: res,
    proxyUrl: `${SB_BASE}/bff/stream?subjectId=${subjectId}&resolution=${res}`,
    downloadUrl: `${SB_BASE}/bff/stream?subjectId=${subjectId}&resolution=${res}&download=1`,
  }));
}

/**
 * Try to get subtitle URL for a subject.
 * Returns a .vtt URL if found.
 */
async function fetchSubtitle(subjectId: string, lang = 'en'): Promise<string | null> {
  try {
    // Try XCASPER captions endpoint
    const url = `${SB_BASE}/captions?subjectId=${subjectId}&lang=${lang}`;
    const r = await fetch(url, { headers: BH });
    if (!r.ok) return null;
    const json = await r.json();
    // Look for a .vtt or .srt URL in response
    const walk = (obj: unknown): string | null => {
      if (!obj || typeof obj !== 'object') return null;
      if (typeof obj === 'string' && (obj.endsWith('.vtt') || obj.endsWith('.srt'))) return obj;
      for (const val of Object.values(obj as Record<string, unknown>)) {
        if (typeof val === 'string' && (val.includes('.vtt') || val.includes('.srt') || val.includes('subtitle'))) {
          return val;
        }
        if (val && typeof val === 'object') {
          const found = walk(val);
          if (found) return found;
        }
      }
      return null;
    };
    return walk(json);
  } catch { return null; }
}

/**
 * Fallback: Try Dixon Omega API for movie streams.
 * Uses /api/movie/moviebox-universal with detailPath.
 */
async function tryOmegaFallback(params: {
  xcasperId: string;
  detailPath: string;
  type: string;
  season: number;
  episode: number;
}): Promise<StreamObj[] | null> {
  const { xcasperId, detailPath, type, season, episode } = params;
  try {
    let url: string;
    if (type === 'tv' && detailPath) {
      url = `${OMEGA_BASE}/moviebox-series-sources?id=${xcasperId}&season=${season}&episode=${episode}&path=${encodeURIComponent(detailPath)}`;
    } else {
      url = `${OMEGA_BASE}/moviebox-universal?id=${xcasperId}&type=${type}`;
    }
    console.log('[omega-fallback] Trying:', url);
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });
    if (!r.ok) return null;
    const json = await r.json();
    console.log('[omega-fallback] Response:', JSON.stringify(json).slice(0, 500));

    // Extract stream URLs from Omega response
    const streams: StreamObj[] = [];
    const walk = (obj: unknown): void => {
      if (!obj || typeof obj !== 'object') return;
      const o = obj as Record<string, unknown>;
      // Look for url/link fields that look like video streams
      if (typeof o.url === 'string' && o.url.startsWith('http') && (o.url.includes('.mp4') || o.url.includes('stream') || o.url.includes('proxy'))) {
        const q = String(o.quality || o.resolution || o.label || '480');
        streams.push({
          quality: q,
          resolutions: q.replace('p', '').replace('P', ''),
          proxyUrl: o.url,
          downloadUrl: o.url,
        });
        return;
      }
      if (Array.isArray(obj)) {
        obj.forEach(walk);
        return;
      }
      Object.values(o).forEach(walk);
    };
    walk(json);
    return streams.length > 0 ? streams : null;
  } catch (e) {
    console.warn('[omega-fallback] Error:', e);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const xcasperId: string = String(body.id || '');
    const type: string = body.type || 'movie';
    const season: number = Number(body.season) || 1;
    const episode: number = Number(body.episode) || 1;
    const title: string = body.title || '';
    const detailPath: string = body.detailPath || '';

    console.log('[stream-proxy] Request:', { xcasperId, type, season, episode, title });

    if (!xcasperId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing subjectId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Build streams directly from XCASPER subjectId ─────────────────────────
    // The bff/stream endpoint accepts the XCASPER subjectId directly and serves
    // video bytes. These URLs work in <video src> without any additional proxy.
    const streams = buildXcasperStreams(xcasperId);
    console.log('[stream-proxy] ✅ Built', streams.length, 'stream URLs for subjectId:', xcasperId);

    // ── Fetch subtitle ────────────────────────────────────────────────────────
    const subtitleUrl = await fetchSubtitle(xcasperId).catch(() => null);

    // ── Return success with all quality options ───────────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        streams,
        // Best single stream for backward compatibility
        stream: streams.find(s => s.resolutions === '720') || streams[0],
        subtitleUrl,
        xcasperId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (e) {
    console.error('[stream-proxy] Fatal error:', e);

    // Last resort: if we have xcasperId in body, still try to build streams
    try {
      const body = await req.clone().json().catch(() => ({}));
      const xcasperId: string = String(body?.id || '');
      if (xcasperId) {
        const streams = buildXcasperStreams(xcasperId);
        return new Response(
          JSON.stringify({ success: true, streams, stream: streams[1] || streams[0] }),
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

export interface Movie {
  subjectId: string;
  subjectType: number; // 1=movie, 2=TV show
  title: string;
  description: string;
  releaseDate: string;
  duration: number;
  genre: string;
  cover: {
    url: string;
    width: number;
    height: number;
  };
  countryName: string;
  imdbRatingValue: string;
  imdbRatingCount: number;
  subtitles: string;
  hasResource: boolean;
  detailPath: string;
  staffList: Staff[];
  stills?: { url: string } | null;
  postTitle?: string;
}

export interface Staff {
  staffId: string;
  staffType: number;
  name: string;
  character: string;
  avatarUrl: string;
  detailPath: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  isPremium: boolean;
  premiumPlan?: string;
  premiumExpiry?: string;
  avatar?: string;
  watchHistory: WatchHistory[];
  watchlist: string[];
  createdAt: string;
}

export interface WatchHistory {
  subjectId: string;
  title: string;
  cover: string;
  timestamp: number;
  duration: number;
  watchedAt: string;
  subjectType: number;
}

export interface PaymentProof {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  plan: string;
  amount: string;
  proofBase64: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
  popular?: boolean;
}

// ─── Stream types ──────────────────────────────────────────────────────────────

export interface StreamQuality {
  /** The URL that actually works in <video> — server-side proxied */
  proxyUrl: string;
  /** Raw origin URL (may have CORS issues) */
  url?: string;
  /** Resolution label: "360", "480", "720", "1080" */
  resolutions?: string;
  quality?: string;
  format?: string;
  /** Subtitle .vtt / .srt URL */
  subtitleUrl?: string;
}

export interface StreamResponse {
  code?: number;
  success?: boolean;
  message?: string;
  data?: StreamData | StreamData[] | { streams?: StreamQuality[] } | unknown;
}

export interface StreamData {
  url?: string;
  proxyUrl?: string;
  link?: string;
  quality?: string;
  format?: string;
  subtitleUrl?: string;
  streams?: StreamQuality[];
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/hooks/useAuth';
import { Play, Trash2, Download, HardDrive, Crown, AlertCircle, Clock, Wifi, WifiOff } from 'lucide-react';

interface DownloadedItem {
  subjectId: string;
  title: string;
  cover: string;
  subjectType: number;
  streamUrl: string;
  downloadedAt: string;
  fileSize?: number;
  duration?: number;
}

const DB_KEY = 'playmax_downloads_v1';

function getDownloads(): DownloadedItem[] {
  try { return JSON.parse(localStorage.getItem(DB_KEY) || '[]'); } catch { return []; }
}
function saveDownloads(items: DownloadedItem[]) {
  localStorage.setItem(DB_KEY, JSON.stringify(items));
}
export function saveDownload(item: DownloadedItem) {
  const existing = getDownloads().filter(d => d.subjectId !== item.subjectId);
  saveDownloads([item, ...existing].slice(0, 50));
}

function formatSize(bytes?: number): string {
  if (!bytes) return 'Unknown size';
  if (bytes > 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function formatDuration(sec?: number): string {
  if (!sec) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function DownloadManagerPage() {
  const { session, profile } = useAuth();
  const isPremium = (profile?.is_premium as boolean) || (() => {
    const e = localStorage.getItem('playmax_ad_premium');
    return e ? new Date(e) > new Date() : false;
  })();

  const [downloads, setDownloads] = useState<DownloadedItem[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setDownloads(getDownloads());
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  const handleDelete = (subjectId: string) => {
    setDeletingId(subjectId);
    setTimeout(() => {
      const updated = downloads.filter(d => d.subjectId !== subjectId);
      saveDownloads(updated);
      setDownloads(updated);
      setDeletingId(null);
    }, 300);
  };

  const handleClearAll = () => {
    if (!window.confirm('Remove all downloads?')) return;
    saveDownloads([]);
    setDownloads([]);
  };

  const totalSize = downloads.reduce((acc, d) => acc + (d.fileSize || 0), 0);

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <Navbar />
      <main className="pt-[68px] pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="flex items-center justify-between py-8 border-b border-gray-800/60 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center shadow-lg">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 4v10m0 0l-3-3m3 3l3-3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4 17v1a2 2 0 002 2h12a2 2 0 002-2v-1" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <h1 className="text-white text-2xl font-black">Downloads</h1>
                <p className="text-gray-600 text-sm">Watch offline anytime — no internet needed</p>
              </div>
            </div>
            {isOnline ? (
              <div className="flex items-center gap-1.5 text-green-400 text-xs font-bold bg-green-950/40 border border-green-800/40 px-3 py-1.5 rounded-full">
                <Wifi size={12} /> Online
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-orange-400 text-xs font-bold bg-orange-950/40 border border-orange-800/40 px-3 py-1.5 rounded-full">
                <WifiOff size={12} /> Offline Mode
              </div>
            )}
          </div>

          {/* Stats bar */}
          {downloads.length > 0 && (
            <div className="flex items-center gap-4 mb-6 bg-[#141414] rounded-2xl p-4 border border-gray-800/40">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <HardDrive size={16} className="text-blue-400" />
                <span className="text-white font-bold">{downloads.length}</span> saved
              </div>
              {totalSize > 0 && (
                <div className="text-gray-600 text-sm">
                  ~<span className="text-white font-bold">{formatSize(totalSize)}</span> used
                </div>
              )}
              <button
                onClick={handleClearAll}
                className="ml-auto flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 transition-colors font-semibold"
              >
                <Trash2 size={12} /> Clear All
              </button>
            </div>
          )}

          {/* Offline tip */}
          {!isOnline && downloads.length > 0 && (
            <div className="mb-6 bg-blue-950/30 border border-blue-800/40 rounded-2xl p-4 flex items-start gap-3">
              <WifiOff size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-300 font-bold text-sm">Offline Mode Active</p>
                <p className="text-blue-700 text-xs mt-0.5">You can still watch your downloaded content below.</p>
              </div>
            </div>
          )}

          {/* Not logged in */}
          {!session ? (
            <div className="text-center py-24">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-[#141414] border border-gray-800 flex items-center justify-center mb-5">
                <Download size={32} className="text-gray-700" />
              </div>
              <p className="text-white font-black text-xl mb-2">Sign in to save downloads</p>
              <p className="text-gray-600 text-sm mb-6">Create a free account to download movies and shows</p>
              <Link to="/login" className="bg-[#e50914] text-white font-black px-8 py-3 rounded-2xl hover:bg-red-700 transition-colors">
                Sign In
              </Link>
            </div>
          ) : downloads.length === 0 ? (
            /* Empty state */
            <div className="text-center py-24">
              <div className="w-24 h-24 mx-auto rounded-3xl bg-[#141414] border border-gray-800 flex items-center justify-center mb-6">
                <Download size={40} className="text-gray-700" />
              </div>
              <h2 className="text-white font-black text-2xl mb-3">No downloads yet</h2>
              <p className="text-gray-500 text-sm max-w-sm mx-auto mb-8 leading-relaxed">
                When you save a movie or show from the watch page, it will appear here for offline viewing.
              </p>
              <Link to="/" className="bg-[#e50914] text-white font-black px-8 py-3.5 rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-900/30">
                Browse Content
              </Link>

              {/* How to download */}
              <div className="mt-12 max-w-sm mx-auto text-left">
                <p className="text-gray-600 text-xs font-black uppercase tracking-wider mb-4">How to save for offline</p>
                <div className="space-y-3">
                  {[
                    ['Play any movie or show', 'Go to Movies, TV Shows, or search'],
                    ['Click "Save" button', 'Find the Save button below the player'],
                    ['Watch offline anytime', 'Your content appears here'],
                  ].map(([title, desc], i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#e50914]/20 border border-[#e50914]/30 flex items-center justify-center flex-shrink-0 mt-0.5 text-[#e50914] text-xs font-black">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-white text-sm font-semibold">{title}</p>
                        <p className="text-gray-600 text-xs">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Downloads list */
            <div className="space-y-3">
              {downloads.map(item => (
                <div
                  key={item.subjectId}
                  className={`bg-[#141414] rounded-2xl border border-gray-800/40 overflow-hidden transition-all duration-300 ${deletingId === item.subjectId ? 'opacity-0 scale-95' : 'opacity-100'}`}
                >
                  <div className="flex items-center gap-4 p-4">
                    {/* Cover */}
                    <Link to={`/watch/${item.subjectId}?type=${item.subjectType}&title=${encodeURIComponent(item.title)}&cover=${encodeURIComponent(item.cover)}`} className="flex-shrink-0">
                      <div className="w-20 h-28 rounded-xl overflow-hidden bg-gray-900 relative group">
                        {item.cover && (
                          <img src={item.cover} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-10 h-10 rounded-full bg-[#e50914] flex items-center justify-center">
                            <Play size={16} fill="white" className="text-white ml-0.5" />
                          </div>
                        </div>
                      </div>
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <Link to={`/watch/${item.subjectId}?type=${item.subjectType}&title=${encodeURIComponent(item.title)}&cover=${encodeURIComponent(item.cover)}`}>
                        <h3 className="text-white font-black text-base line-clamp-2 hover:text-[#e50914] transition-colors">{item.title}</h3>
                      </Link>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${item.subjectType === 2 ? 'bg-purple-600/20 text-purple-400' : 'bg-blue-600/20 text-blue-400'}`}>
                          {item.subjectType === 2 ? 'TV Show' : 'Movie'}
                        </span>
                        {item.duration && (
                          <span className="flex items-center gap-1 text-gray-600 text-xs">
                            <Clock size={10} /> {formatDuration(item.duration)}
                          </span>
                        )}
                        {item.fileSize && item.fileSize > 0 && (
                          <span className="flex items-center gap-1 text-gray-600 text-xs">
                            <HardDrive size={10} /> {formatSize(item.fileSize)}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 text-xs mt-1.5">
                        Saved {new Date(item.downloadedAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                      <Link
                        to={`/watch/${item.subjectId}?type=${item.subjectType}&title=${encodeURIComponent(item.title)}&cover=${encodeURIComponent(item.cover)}`}
                        className="w-10 h-10 rounded-xl bg-[#e50914] flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg shadow-red-900/30"
                        title="Watch"
                      >
                        <Play size={16} fill="white" className="text-white ml-0.5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(item.subjectId)}
                        className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar (decorative) */}
                  <div className="h-0.5 bg-gray-800">
                    <div className="h-full bg-gradient-to-r from-[#e50914] to-red-700 w-full" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Premium promo */}
          {!isPremium && (
            <div className="mt-10 bg-gradient-to-r from-[#1a0505] to-[#0d0d0d] border border-[#e50914]/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#f5c518] to-yellow-600 flex items-center justify-center flex-shrink-0">
                  <Crown size={22} className="text-black" />
                </div>
                <div>
                  <p className="text-white font-black text-base">Unlock PlayMax+ Downloads</p>
                  <p className="text-gray-500 text-sm">Save HD content · Watch offline · No expiry</p>
                </div>
              </div>
              <Link to="/premium" className="flex-shrink-0 bg-[#e50914] text-white font-black px-7 py-3 rounded-xl hover:bg-red-700 transition-all text-sm shadow-lg shadow-red-900/30">
                Upgrade Now
              </Link>
            </div>
          )}

          {/* Storage info */}
          <div className="mt-8 bg-[#141414] rounded-2xl p-4 border border-gray-800/40">
            <div className="flex items-start gap-3">
              <AlertCircle size={16} className="text-gray-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-gray-600 leading-relaxed">
                <span className="text-gray-400 font-semibold">Offline storage note:</span> Downloads are saved as stream links in your browser. For full offline video caching, your browser must support service worker caching. Clearing browser data may remove saved content.
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}


import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/hooks/useAuth';
import { logout } from '@/lib/auth';
import { fetchWatchHistory, fetchWatchlist, removeWatchlistItem, deleteWatchHistory, updateUserProfile, uploadProofImage, submitProof } from '@/lib/db';
import { SUBSCRIPTION_PLANS } from '@/constants';
import { User, Clock, Bookmark, Crown, Upload, LogOut, Play, Trash2, Check, Download, CreditCard, HardDrive, WifiOff, Wifi, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { WatchlistItem } from '@/lib/db';
import type { WatchHistory } from '@/types';
import { saveDownload } from './DownloadManagerPage';

// ─── Inline Download Manager Tab ────────────────────────────────────────────
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
const getDownloads = (): DownloadedItem[] => { try { return JSON.parse(localStorage.getItem(DB_KEY) || '[]'); } catch { return []; } };
const saveDownloads = (items: DownloadedItem[]) => localStorage.setItem(DB_KEY, JSON.stringify(items));

function formatDur(sec?: number): string {
  if (!sec) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function DownloadManagerTab({ userId }: { userId: string }) {
  const [downloads, setDownloads] = useState<DownloadedItem[]>(() => getDownloads());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // The error "Definition for rule '@typescript-eslint/no-unused-vars' was not found"
  // indicates an ESLint configuration issue, not a TypeScript syntax error.
  // The original comment `// eslint-disable-next-line @typescript-eslint/no-unused-vars`
  // and the line `void userId;` were attempts to suppress an ESLint warning for `userId`
  // being unused within the component's *implementation* (even if it's used in the signature).
  // Since the problem is with the ESLint rule *definition* not being found,
  // the most direct "fix" within the context of syntax correction (and assuming the linter config is problematic)
  // is to remove the ESLint directive and the `void` expression.
  // If `userId` is genuinely unused in the logic but needs to be passed as a prop,
  // removing this line doesn't introduce a TypeScript syntax error.
  // A working linter would then flag `userId` as unused, but that's a linter *warning* based on code usage,
  // not a syntax error.
  // For the purpose of fixing the reported syntax/linter definition error, this line is removed.

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
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

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-800/30 flex items-center justify-center">
            <Download size={18} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-white font-black text-lg">Download Manager</h2>
            <p className="text-gray-600 text-xs">{downloads.length} saved items</p>
          </div>
        </div>
        {isOnline
          ? <div className="flex items-center gap-1.5 text-green-400 text-xs font-bold bg-green-950/30 border border-green-800/30 px-3 py-1.5 rounded-full"><Wifi size={10} /> Online</div>
          : <div className="flex items-center gap-1.5 text-orange-400 text-xs font-bold bg-orange-950/30 border border-orange-800/30 px-3 py-1.5 rounded-full"><WifiOff size={10} /> Offline</div>
        }
      </div>

      {downloads.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#1a1a1a] border border-gray-800 flex items-center justify-center mb-4">
            <Download size={28} className="text-gray-700" />
          </div>
          <p className="text-gray-400 font-bold text-sm mb-1">No saved downloads</p>
          <p className="text-gray-700 text-xs mb-5">When watching a movie, click the Download button to save it here.</p>
          <Link to="/" className="bg-[#e50914] text-white font-black px-6 py-2.5 rounded-xl hover:bg-red-700 transition-colors text-sm">
            Browse &amp; Download
          </Link>
        </div>
      ) : (
        <>
          <div className="flex justify-end mb-3">
            <button
              onClick={() => { if (window.confirm('Remove all downloads?')) { saveDownloads([]); setDownloads([]); } }}
              className="text-xs text-red-500 hover:text-red-400 font-semibold flex items-center gap-1 transition-colors"
            >
              <Trash2 size={11} /> Clear All
            </button>
          </div>
          <div className="space-y-3">
            {downloads.map(item => (
              <div key={item.subjectId}
                className={`bg-[#1a1a1a] rounded-2xl border border-gray-800/40 flex items-center gap-3 p-3.5 transition-all duration-300 ${deletingId === item.subjectId ? 'opacity-0 scale-95' : ''}`}>
                <Link
                  to={`/watch/${item.subjectId}?type=${item.subjectType}&title=${encodeURIComponent(item.title)}&cover=${encodeURIComponent(item.cover)}`}
                  className="flex-shrink-0"
                >
                  <div className="w-14 h-20 rounded-xl overflow-hidden bg-gray-900 relative group">
                    {item.cover && <img src={item.cover} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play size={14} fill="white" className="text-white" />
                    </div>
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm line-clamp-2">{item.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.subjectType === 2 ? 'bg-purple-600/20 text-purple-400' : 'bg-blue-600/20 text-blue-400'}`}>
                      {item.subjectType === 2 ? 'Series' : 'Movie'}
                    </span>
                    {item.duration && <span className="text-gray-700 text-[10px] flex items-center gap-0.5"><HardDrive size={9} /> {formatDur(item.duration)}</span>}
                  </div>
                  <p className="text-gray-700 text-[10px] mt-1">{new Date(item.downloadedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    to={`/watch/${item.subjectId}?type=${item.subjectType}&title=${encodeURIComponent(item.title)}&cover=${encodeURIComponent(item.cover)}`}
                    className="w-9 h-9 rounded-xl bg-[#e50914] flex items-center justify-center hover:bg-red-700 transition-colors"
                  >
                    <Play size={13} fill="white" className="text-white ml-0.5" />
                  </Link>
                  <button onClick={() => handleDelete(item.subjectId)}
                    className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-950/40 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Storage note */}
          <div className="mt-6 bg-[#1a1a1a] rounded-2xl p-4 border border-gray-800/40">
            <div className="flex items-start gap-2">
              <AlertCircle size={13} className="text-gray-700 flex-shrink-0 mt-0.5" />
              <p className="text-gray-700 text-[11px] leading-relaxed">
                Downloads are saved as streaming links. They require internet on first load. Clear browser data may remove saved items.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

type TabId = 'profile' | 'history' | 'watchlist' | 'premium' | 'downloads';

export default function ProfilePage() {
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = (searchParams.get('tab') || 'profile') as TabId;
  const [tab, setTab] = useState<TabId>(defaultTab);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const proofRef = useRef<HTMLInputElement>(null);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<WatchHistory[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

  const isPremium = (profile?.is_premium as boolean) || (() => {
    const e = localStorage.getItem('playmax_ad_premium');
    return e ? new Date(e) > new Date() : false;
  })();

  useEffect(() => {
    if (profile) setDisplayName((profile.display_name as string) || '');
  }, [profile]);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchWatchHistory(session.user.id).then(setHistory);
    fetchWatchlist(session.user.id).then(setWatchlist);
  }, [session?.user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#e50914] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-[#141414] border border-gray-800 flex items-center justify-center mb-5">
            <User size={36} className="text-gray-700" />
          </div>
          <p className="text-gray-400 mb-4 font-semibold">Sign in to view your profile</p>
          <Link to="/login" className="bg-[#e50914] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-red-700 transition-colors text-sm">Sign In</Link>
        </div>
      </div>
    );
  }

  const name = (profile?.display_name as string) || session.user.email?.split('@')[0] || 'User';
  const email = session.user.email || '';
  const initials = name[0]?.toUpperCase() || 'U';

  const handleSave = async () => {
    setSaving(true);
    await updateUserProfile(session.user.id, { display_name: displayName });
    setSaving(false);
    toast.success('Profile updated!');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    window.location.reload();
  };

  const handleProofFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB'); return; }
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = () => setProofPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmitProof = async () => {
    if (!selectedPlan || !proofFile) {
      toast.error('Select a plan and upload your payment proof screenshot');
      return;
    }
    setSubmitting(true);
    try {
      const proofUrl = await uploadProofImage(session.user.id, proofFile);
      const planInfo = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan);
      await submitProof(session.user.id, {
        plan: selectedPlan,
        amount: `₦${planInfo?.price.toLocaleString()}`,
        proofUrl,
      });
      toast.success('Payment proof submitted! Admin will review within 24 hours.');
      setProofFile(null);
      setProofPreview('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload proof. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveWatchlist = async (subjectId: string) => {
    await removeWatchlistItem(session.user.id, subjectId);
    setWatchlist(w => w.filter(item => item.subjectId !== subjectId));
    toast.success('Removed from watchlist');
  };

  const handleDeleteHistory = async (subjectId: string) => {
    await deleteWatchHistory(session.user.id, subjectId);
    setHistory(h => h.filter(item => item.subjectId !== subjectId));
    toast.success('Removed from history');
  };

  const TABS: { id: TabId; label: string; icon: typeof User }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'history', label: `History (${history.length})`, icon: Clock },
    { id: 'watchlist', label: `Watchlist (${watchlist.length})`, icon: Bookmark },
    { id: 'downloads', label: 'Downloads', icon: Download },
    { id: 'premium', label: isPremium ? 'Premium ✓' : 'Get Premium', icon: Crown },
  ];

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <Navbar />
      <main className="pt-[68px] pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Profile header */}
          <div className="flex items-center gap-5 py-8 border-b border-gray-800/60 mb-6">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-xl ${isPremium ? 'bg-gradient-to-br from-[#f5c518] to-yellow-600' : 'bg-gradient-to-br from-[#e50914] to-red-800'}`}>
              {isPremium ? <Crown size={32} className="text-black" /> : initials}
            </div>
            <div>
              <h1 className="text-white text-2xl font-black">{name}</h1>
              <p className="text-gray-500 text-sm mt-0.5">{email}</p>
              {isPremium && (
                <div className="flex items-center gap-1.5 mt-2 bg-yellow-950/50 border border-yellow-800/40 px-3 py-1 rounded-full w-fit">
                  <Crown size={12} className="text-[#f5c518]" />
                  <span className="text-[#f5c518] text-xs font-black">PLAYMAX+ ACTIVE</span>
                  {profile?.premium_plan && <span className="text-yellow-700 text-xs capitalize">· {profile.premium_plan as string}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0.5 border-b border-gray-800/60 mb-8 overflow-x-auto scrollbar-hide">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-all ${tab === t.id ? 'border-[#e50914] text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
              >
                <t.icon size={14} /> {t.label}
              </button>
            ))}
          </div>

          {/* Profile Tab */}
          {tab === 'profile' && (
            <div className="max-w-md space-y-5">
              <div>
                <label className="block text-gray-400 text-sm mb-2 font-medium">Display name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-gray-700/60 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-[#e50914] transition-colors font-medium"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2 font-medium">Email</label>
                <input type="email" value={email} disabled className="w-full bg-gray-900/50 border border-gray-800 text-gray-500 px-4 py-3 rounded-xl cursor-not-allowed" />
              </div>
              <button onClick={handleSave} disabled={saving} className="bg-[#e50914] text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 disabled:opacity-50 transition-colors text-sm">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <div className="pt-4 border-t border-gray-800/60 space-y-3">
                <Link to="/downloads" className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-400 transition-colors font-medium">
                  <Download size={15} /> My Downloads
                </Link>
                <Link to="/party" className="flex items-center gap-2 text-sm text-gray-500 hover:text-purple-400 transition-colors font-medium">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                  Watch Party
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-400 transition-colors font-medium">
                  <LogOut size={15} /> Sign out of PlayMax TV
                </button>
              </div>
            </div>
          )}

          {/* History Tab */}
          {tab === 'history' && (
            <div>
              {history.length === 0 ? (
                <div className="text-center py-20">
                  <Clock size={52} className="text-gray-800 mx-auto mb-4" />
                  <p className="text-gray-500 font-semibold">No watch history yet</p>
                  <Link to="/" className="mt-4 inline-block text-[#e50914] hover:text-red-400 text-sm font-medium">Start watching →</Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {history.map(h => {
                    const pct = h.duration ? Math.min((h.timestamp / h.duration) * 100, 100) : 0;
                    return (
                      <div key={h.subjectId} className="flex gap-3 bg-[#141414] rounded-2xl p-3 border border-gray-800/40 hover:border-gray-700/60 transition-all group">
                        <Link to={`/watch/${h.subjectId}?type=${h.subjectType}&title=${encodeURIComponent(h.title)}&cover=${encodeURIComponent(h.cover || '')}`} className="w-24 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-gray-800 relative">
                          {h.cover && <img src={h.cover} alt={h.title} className="w-full h-full object-cover" />}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50 transition-opacity">
                            <Play size={16} fill="white" className="text-white" />
                          </div>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold line-clamp-1">{h.title}</p>
                          <p className="text-gray-600 text-xs mt-0.5">{Math.floor(h.timestamp / 60)}m watched</p>
                          <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-[#e50914] rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 flex-shrink-0 self-center">
                          <button
                            onClick={() => {
                              saveDownload({ subjectId: h.subjectId, title: h.title, cover: h.cover || '', subjectType: h.subjectType, streamUrl: '', downloadedAt: new Date().toISOString(), duration: h.duration });
                              toast.success('Saved to downloads');
                            }}
                            title="Save to downloads"
                            className="text-gray-700 hover:text-blue-400 transition-colors"
                          >
                            <Download size={13} />
                          </button>
                          <button onClick={() => handleDeleteHistory(h.subjectId)} className="text-gray-700 hover:text-red-500 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Watchlist Tab */}
          {tab === 'watchlist' && (
            <div>
              {watchlist.length === 0 ? (
                <div className="text-center py-20">
                  <Bookmark size={52} className="text-gray-800 mx-auto mb-4" />
                  <p className="text-gray-500 font-semibold">Your watchlist is empty</p>
                  <Link to="/" className="mt-4 inline-block text-[#e50914] hover:text-red-400 text-sm font-medium">Add movies to watchlist →</Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {watchlist.map(item => (
                    <div key={item.subjectId} className="group relative">
                      <Link to={`/watch/${item.subjectId}?type=${item.subjectType}&title=${encodeURIComponent(item.title || '')}&cover=${encodeURIComponent(item.cover || '')}`}>
                        <div className="relative h-48 sm:h-60 rounded-xl overflow-hidden bg-gray-900 group-hover:-translate-y-1 transition-transform duration-300">
                          {item.cover && <img src={item.cover} alt={item.title || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play size={24} fill="white" className="text-white" />
                          </div>
                        </div>
                        <p className="text-gray-300 text-xs font-semibold mt-2 line-clamp-2 group-hover:text-white transition-colors">{item.title}</p>
                      </Link>
                      <button onClick={() => handleRemoveWatchlist(item.subjectId)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-black/90 transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

  {/* ─── Downloads Tab ─────────────────────────────────────────────── */}
          {tab === 'downloads' && (
            <DownloadManagerTab userId={session.user.id} />
          )}

          {/* Premium Tab */}
          {tab === 'premium' && (
            <div>
              {isPremium ? (
                <div className="bg-gradient-to-br from-[#1a1000] to-[#0d0d0d] border border-yellow-800/30 rounded-2xl p-6 mb-8">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#f5c518] to-yellow-600 flex items-center justify-center shadow-lg">
                      <Crown size={24} className="text-black" />
                    </div>
                    <div>
                      <h3 className="text-white font-black text-xl">PlayMax+ Active</h3>
                      <p className="text-yellow-600 text-sm capitalize">{profile?.premium_plan as string} Plan</p>
                    </div>
                  </div>
                  {profile?.premium_expiry && (
                    <p className="text-gray-500 text-sm mb-3">Expires: <span className="text-white font-semibold">{new Date(profile.premium_expiry as string).toLocaleDateString()}</span></p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {['Ad-free', 'HD Quality', 'Offline Downloads', 'Watch Party', 'Multi-device'].map(f => (
                      <span key={f} className="flex items-center gap-1 text-xs text-green-400 bg-green-950/40 border border-green-800/30 px-2.5 py-1 rounded-full">
                        <Check size={11} /> {f}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-amber-950/20 border border-amber-800/30 rounded-2xl">
                  <p className="text-amber-300 font-bold text-sm">No active PlayMax+ subscription</p>
                  <p className="text-amber-700 text-xs mt-1">Pay via Paystack (instant activation) or PayPal (manual review)</p>
                </div>
              )}

              {/* Quick links */}
              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                <Link to="/premium" className="flex items-center gap-3 bg-[#e50914]/10 border border-[#e50914]/30 hover:border-[#e50914]/60 rounded-2xl p-4 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-[#e50914]/20 flex items-center justify-center">
                    <Crown size={18} className="text-[#e50914]" />
                  </div>
                  <div>
                    <p className="text-white font-black text-sm">Pay with Paystack</p>
                    <p className="text-gray-600 text-xs">Instant activation · Card, Bank, USSD</p>
                  </div>
                </Link>
                <a href="https://www.paypal.com/paypalme/libertyjr21" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-[#003087]/10 border border-[#003087]/30 hover:border-[#003087]/60 rounded-2xl p-4 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-[#003087]/20 flex items-center justify-center">
                    <CreditCard size={18} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-black text-sm">Pay with PayPal</p>
                    <p className="text-gray-600 text-xs">International · libertyjr21@gmail.com</p>
                  </div>
                </a>
              </div>

              {/* Upload PayPal proof */}
              <div className="bg-[#141414] rounded-2xl p-5 border border-gray-800/40">
                <h3 className="text-white font-black mb-1 flex items-center gap-2">
                  <Upload size={16} className="text-gray-400" /> Upload PayPal Payment Proof
                </h3>
                <p className="text-gray-500 text-xs mb-5">Only required for PayPal payments. Paystack activates automatically.</p>

                {/* Plan selector */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {SUBSCRIPTION_PLANS.map(plan => (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${selectedPlan === plan.id ? 'border-[#e50914] bg-[#e50914]/10' : 'border-gray-800 hover:border-gray-700'}`}
                    >
                      <p className="text-white font-black text-xs capitalize">{plan.name}</p>
                      <p className="text-gray-500 text-[10px] mt-0.5">₦{plan.price.toLocaleString()}</p>
                    </button>
                  ))}
                </div>

                <div
                  onClick={() => proofRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${proofPreview ? 'border-green-600 bg-green-950/10' : 'border-gray-800 hover:border-gray-600 hover:bg-[#1a1a1a]'}`}
                >
                  {proofPreview ? (
                    <>
                      <img src={proofPreview} alt="proof" className="max-h-28 mx-auto rounded-xl mb-3 object-contain shadow-xl" />
                      <p className="text-green-400 font-bold text-xs">✓ Proof uploaded — click to change</p>
                    </>
                  ) : (
                    <>
                      <Upload size={32} className="text-gray-700 mx-auto mb-2" />
                      <p className="text-gray-400 font-medium text-sm">Click to upload payment screenshot</p>
                      <p className="text-gray-700 text-xs mt-1">PNG, JPG up to 10MB</p>
                    </>
                  )}
                </div>
                <input ref={proofRef} type="file" accept="image/*" onChange={handleProofFile} className="hidden" />

                <button
                  onClick={handleSubmitProof}
                  disabled={submitting || !selectedPlan || !proofFile}
                  className="w-full mt-4 bg-[#e50914] text-white py-3.5 rounded-2xl font-black hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-red-900/20"
                >
                  {submitting ? 'Uploading & Submitting...' : 'Submit PayPal Proof'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

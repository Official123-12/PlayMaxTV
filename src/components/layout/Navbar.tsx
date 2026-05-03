import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, Menu, X, ChevronDown, Crown, LogOut, Settings, Clock, Bookmark, User, Download, Users } from 'lucide-react';
import { logout, isAdmin } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
import { CATEGORIES } from '@/constants';

// SVG category icons
const CategoryIcon = ({ id }: { id: string }) => {
  const icons: Record<string, JSX.Element> = {
    movies: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M8 9l4 3-4 3V9z" fill="currentColor"/></svg>,
    tvshows: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M16 2l-4 5M8 2l4 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    sports: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><path d="M12 2c0 0-3 4-3 10s3 10 3 10" stroke="currentColor" strokeWidth="1.8"/><path d="M12 2c0 0 3 4 3 10s-3 10-3 10" stroke="currentColor" strokeWidth="1.8"/><path d="M2 12h20" stroke="currentColor" strokeWidth="1.5"/></svg>,
    livetv: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 9h3v11h14V9h3L12 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><rect x="9" y="13" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg>,
    cartoons: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><circle cx="9" cy="10" r="1.5" fill="currentColor"/><circle cx="15" cy="10" r="1.5" fill="currentColor"/><path d="M9 15c1 1.5 5 1.5 6 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    anime: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2C7 2 3 6 3 11s4 9 9 9 9-4 9-9-4-9-9-9z" stroke="currentColor" strokeWidth="1.8"/><path d="M9 9.5c.5-1 1.5-1.5 3-1.5s2.5.5 3 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M9 13.5c1 1 3 1.5 6 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="9" cy="11" r="1" fill="currentColor"/><circle cx="15" cy="11" r="1" fill="currentColor"/></svg>,
  };
  return icons[id] || null;
};
import { fetchSearchSuggest, searchMovies } from '@/lib/api';

const PlayMaxLogo = () => (
  <svg width="158" height="36" viewBox="0 0 200 46" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="nl1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ff1a2e" />
        <stop offset="100%" stopColor="#cc0010" />
      </linearGradient>
      <linearGradient id="nl2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffd700" />
        <stop offset="100%" stopColor="#f5a800" />
      </linearGradient>
    </defs>
    <circle cx="23" cy="23" r="21" fill="url(#nl1)" />
    <polygon points="18,14 18,32 33,23" fill="white" />
    <text x="52" y="31" fontFamily="'Inter','Arial Black',sans-serif" fontWeight="900" fontSize="22" fill="white" letterSpacing="0.5">PLAY</text>
    <text x="112" y="31" fontFamily="'Inter','Arial Black',sans-serif" fontWeight="900" fontSize="22" fill="#ff1a2e" letterSpacing="1">MA</text>
    <text x="153" y="31" fontFamily="'Inter','Arial Black',sans-serif" fontWeight="900" fontSize="22" fill="#ff1a2e" stroke="#ff1a2e" strokeWidth="0.5">X</text>
    <rect x="176" y="9" width="22" height="15" rx="3.5" fill="url(#nl2)" />
    <text x="180" y="21" fontFamily="'Inter','Arial Black',sans-serif" fontWeight="900" fontSize="10" fill="#000">TV</text>
  </svg>
);

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { session, profile } = useAuth();
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const suggestTimer = useRef<ReturnType<typeof setTimeout>>();

  const user = session ? {
    name: (profile?.display_name as string) || session.user.email?.split('@')[0] || 'User',
    email: session.user.email || '',
    isPremium: (profile?.is_premium as boolean) || false,
  } : null;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => { setMobileOpen(false); setSearchOpen(false); setShowSuggestions(false); }, [location.pathname]);

  // Debounced suggest fetch
  useEffect(() => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (searchQuery.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    suggestTimer.current = setTimeout(async () => {
      // Try suggest API first, fall back to search items
      const suggests = await fetchSearchSuggest(searchQuery);
      if (suggests.length > 0) {
        setSuggestions(suggests);
        setShowSuggestions(true);
      } else {
        // Fallback: use search results titles
        const res = await searchMovies(searchQuery, '1');
        const titles = res.items.slice(0, 5).map(m => m.title);
        setSuggestions(titles);
        setShowSuggestions(titles.length > 0);
      }
    }, 300);
    return () => { if (suggestTimer.current) clearTimeout(suggestTimer.current); };
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (s: string) => {
    navigate(`/search?q=${encodeURIComponent(s)}`);
    setSearchQuery('');
    setShowSuggestions(false);
    setSearchOpen(false);
  };

  const handleLogout = () => {
    logout();
    setProfileOpen(false);
    navigate('/');
    window.location.reload();
  };

  const initials = user?.name?.[0]?.toUpperCase() || 'U';

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#080808]/98 backdrop-blur-md shadow-xl shadow-black/60' : 'bg-gradient-to-b from-black/90 to-transparent'}`}>
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-[68px]">
          <Link to="/" className="flex-shrink-0 hover:opacity-90 transition-opacity">
            <PlayMaxLogo />
          </Link>

          <nav className="hidden lg:flex items-center gap-0.5 ml-6">
            <Link to="/" className={`px-3.5 py-2 text-[13px] font-semibold rounded-lg transition-all ${location.pathname === '/' ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              Home
            </Link>
            {CATEGORIES.map(cat => (
              <Link key={cat.id} to={cat.path}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold rounded-lg transition-all ${location.pathname === cat.path ? 'text-[#e50914] bg-[#e50914]/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <CategoryIcon id={cat.id} />
                {cat.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            {/* Search */}
            {searchOpen ? (
              <div ref={searchRef} className="relative">
                <form onSubmit={handleSearch} className="flex items-center gap-1">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                      placeholder="Search movies, shows..."
                      autoFocus
                      className="bg-gray-900/95 border border-gray-600 text-white placeholder-gray-500 pl-9 pr-4 py-2 rounded-xl text-sm w-52 sm:w-72 focus:outline-none focus:border-[#e50914] transition-all"
                    />
                  </div>
                  <button type="submit" className="bg-[#e50914] p-2.5 rounded-xl hover:bg-red-700 transition-colors">
                    <Search size={15} className="text-white" />
                  </button>
                  <button type="button" onClick={() => { setSearchOpen(false); setShowSuggestions(false); }} className="text-gray-500 hover:text-white p-1.5">
                    <X size={18} />
                  </button>
                </form>
                {/* Autocomplete dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 mt-2 w-[calc(100%-44px)] bg-[#161616] border border-gray-700/60 rounded-2xl shadow-2xl overflow-hidden z-50">
                    {suggestions.map((s, i) => (
                      <button key={i} onClick={() => handleSuggestionClick(s)}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/6 transition-colors text-left">
                        <Search size={13} className="text-gray-600 flex-shrink-0" />
                        <span className="truncate">{s}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => setSearchOpen(true)} className="w-9 h-9 text-gray-400 hover:text-white rounded-xl hover:bg-white/8 transition-all flex items-center justify-center">
                <Search size={19} />
              </button>
            )}

            <Link to="/premium" className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-[#e50914] to-red-700 text-white text-xs font-black px-4 py-2 rounded-xl hover:from-red-500 hover:to-red-700 transition-all shadow-lg shadow-red-900/30">
              <Crown size={13} /> PlayMax+
            </Link>

            <button className="hidden sm:flex w-9 h-9 text-gray-400 hover:text-white rounded-xl hover:bg-white/8 transition-all items-center justify-center relative">
              <Bell size={19} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#e50914] rounded-full" />
            </button>

            {user ? (
              <div className="relative" ref={profileRef}>
                <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-1.5 hover:opacity-90 transition-all">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg ${user.isPremium ? 'bg-gradient-to-br from-[#f5c518] to-yellow-600' : 'bg-gradient-to-br from-[#e50914] to-red-800'}`}>
                    {user.isPremium ? <Crown size={16} className="text-black" /> : initials}
                  </div>
                  <ChevronDown size={13} className={`hidden sm:block text-gray-400 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] w-56 bg-[#161616] border border-gray-700/60 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="px-4 py-3.5 border-b border-gray-800/70">
                      <p className="text-white font-bold text-sm truncate">{user.name}</p>
                      <p className="text-gray-500 text-xs truncate mt-0.5">{user.email}</p>
                      {user.isPremium && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-[#f5c518] mt-1.5 font-black bg-yellow-950/50 px-2 py-0.5 rounded-full">
                          <Crown size={9} /> PLAYMAX+ ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="py-1.5">
                      {[
                        { to: '/profile', icon: User, label: 'My Profile' },
                        { to: '/profile?tab=history', icon: Clock, label: 'Watch History' },
                        { to: '/profile?tab=watchlist', icon: Bookmark, label: 'My Watchlist' },
                        { to: '/downloads', icon: Download, label: 'Downloads' },
                        { to: '/party', icon: Users, label: 'Watch Party' },
                      ].map(item => (
                        <Link key={item.to} to={item.to} onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                          <item.icon size={14} className="text-gray-500" /> {item.label}
                        </Link>
                      ))}
                      {isAdmin(user.email) && (
                        <Link to="/admin" onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#e50914] hover:bg-white/5 transition-colors">
                          <Settings size={14} /> Admin Panel
                        </Link>
                      )}
                    </div>
                    <div className="border-t border-gray-800/70 py-1.5">
                      <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-500 hover:text-red-400 hover:bg-white/5 transition-colors">
                        <LogOut size={14} /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="text-sm text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/8">Sign In</Link>
                <Link to="/register" className="hidden sm:block text-sm bg-white text-black font-bold px-4 py-2 rounded-xl hover:bg-gray-100 transition-all">Join Free</Link>
              </div>
            )}

            <button onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden w-9 h-9 text-gray-400 hover:text-white rounded-xl hover:bg-white/8 transition-all flex items-center justify-center">
              {mobileOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-[#0d0d0d]/98 backdrop-blur-md border-t border-gray-800/60 px-4 py-4">
          {/* Mobile search */}
          <form onSubmit={handleSearch} className="flex gap-2 mb-3">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-[#1a1a1a] border border-gray-800 text-white placeholder-gray-600 pl-8 pr-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#e50914]"
              />
            </div>
            <button type="submit" className="bg-[#e50914] px-4 py-2.5 rounded-xl text-white text-sm font-semibold">Go</button>
          </form>
          <div className="flex flex-col gap-1">
            <Link to="/" className="px-4 py-3 text-sm font-semibold text-gray-200 hover:text-white rounded-xl hover:bg-white/6 transition-colors">Home</Link>
            {CATEGORIES.map(cat => (
              <Link key={cat.id} to={cat.path} className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-400 hover:text-white rounded-xl hover:bg-white/6 transition-colors">
                <CategoryIcon id={cat.id} /> {cat.label}
              </Link>
            ))}
            <Link to="/premium" className="flex items-center gap-2 px-4 py-3 text-sm font-black text-[#e50914] hover:bg-[#e50914]/10 rounded-xl transition-colors mt-1">
              <Crown size={15} /> PlayMax+ Premium
            </Link>
            {!user && <Link to="/register" className="mt-2 text-sm bg-[#e50914] text-white font-bold px-4 py-3 rounded-xl text-center hover:bg-red-700 transition-colors">Join Free</Link>}
          </div>
        </div>
      )}
    </header>
  );
}

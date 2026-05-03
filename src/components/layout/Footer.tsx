import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube, Mail } from 'lucide-react';

const PlayMaxLogoSmall = () => (
  <svg width="130" height="32" viewBox="0 0 160 38" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ff1a2e" /><stop offset="100%" stopColor="#cc0010" />
      </linearGradient>
    </defs>
    <circle cx="19" cy="19" r="17" fill="url(#fGrad)" />
    <polygon points="15,12 15,26 26,19" fill="white" />
    <text x="42" y="26" fontFamily="'Inter','Arial Black',sans-serif" fontWeight="900" fontSize="17" fill="white">PLAY</text>
    <text x="90" y="26" fontFamily="'Inter','Arial Black',sans-serif" fontWeight="900" fontSize="17" fill="#ff1a2e">MAX</text>
    <rect x="128" y="7" width="18" height="13" rx="3" fill="#f5c518" />
    <text x="131" y="18" fontFamily="'Inter','Arial Black',sans-serif" fontWeight="900" fontSize="8" fill="#000">TV</text>
  </svg>
);

// Device SVGs
const DeviceSVGs = [
  <svg key="phone" width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="5" y="2" width="14" height="20" rx="3" stroke="#4b5563" strokeWidth="1.5"/><circle cx="12" cy="18" r="1" fill="#4b5563"/></svg>,
  <svg key="laptop" width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="13" rx="2" stroke="#4b5563" strokeWidth="1.5"/><path d="M1 19h22" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  <svg key="tv" width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="14" rx="2" stroke="#4b5563" strokeWidth="1.5"/><path d="M8 21h8M12 17v4" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  <svg key="tablet" width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="4" y="2" width="16" height="20" rx="2" stroke="#4b5563" strokeWidth="1.5"/><circle cx="12" cy="18" r="1" fill="#4b5563"/></svg>,
];

export default function Footer() {
  return (
    <footer className="bg-[#080808] border-t border-gray-900 pt-14 pb-8 mt-8">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          <div className="col-span-2 md:col-span-1">
            <PlayMaxLogoSmall />
            <p className="text-gray-600 text-sm mt-4 leading-relaxed max-w-xs">
              Your ultimate dark-cinema streaming destination for movies, TV shows, sports, cartoons, and anime.
            </p>
            <div className="flex gap-2 mt-5">
              {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                <button key={i} className="w-9 h-9 rounded-xl bg-[#141414] border border-gray-800 flex items-center justify-center text-gray-600 hover:text-white hover:border-[#e50914] hover:bg-[#e50914]/10 transition-all">
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white font-black text-sm mb-4 uppercase tracking-wider">Browse</h4>
            <ul className="space-y-2.5">
              {[['Movies', '/movies'], ['TV Shows', '/tvshows'], ['Sports', '/sports'], ['Cartoons', '/cartoons'], ['Anime', '/anime'], ['Live TV', '/live']].map(([label, path]) => (
                <li key={path}>
                  <Link to={path} className="text-gray-600 text-sm hover:text-white transition-colors font-medium">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-black text-sm mb-4 uppercase tracking-wider">Account</h4>
            <ul className="space-y-2.5">
              {[['Sign Up', '/register'], ['Sign In', '/login'], ['My Profile', '/profile'], ['PlayMax+', '/premium'], ['My Watchlist', '/profile?tab=watchlist'], ['Downloads', '/downloads']].map(([label, path]) => (
                <li key={label}>
                  <Link to={path} className="text-gray-600 text-sm hover:text-white transition-colors font-medium">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-black text-sm mb-4 uppercase tracking-wider">Support</h4>
            <ul className="space-y-2.5 mb-5">
              {['Help Center', 'Terms of Service', 'Privacy Policy', 'Contact Us'].map(label => (
                <li key={label}>
                  <a href="#" className="text-gray-600 text-sm hover:text-white transition-colors font-medium">{label}</a>
                </li>
              ))}
            </ul>
            <a href="mailto:support@playmaxtv.com.ng" className="flex items-center gap-2 text-gray-600 text-sm hover:text-white transition-colors">
              <Mail size={13} /> support@playmaxtv.com.ng
            </a>
          </div>
        </div>

        <div className="border-t border-gray-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-700 text-xs">© {new Date().getFullYear()} PlayMax TV. All rights reserved.</p>
          <p className="text-gray-700 text-xs">
            Made with{' '}
            <svg className="inline w-3 h-3 text-red-500" viewBox="0 0 24 24" fill="#e50914"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            {' '}by <span className="text-gray-500 font-semibold">Damini × Nicky Tech</span>
          </p>
          <div className="flex items-center gap-2 text-gray-700 text-xs">
            <span>Available on</span>
            {DeviceSVGs.map((svg, i) => <span key={i}>{svg}</span>)}
          </div>
        </div>
      </div>
    </footer>
  );
}

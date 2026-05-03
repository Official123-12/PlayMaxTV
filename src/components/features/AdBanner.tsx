import { Link } from 'react-router-dom';
import { Crown, X } from 'lucide-react';
import { useState } from 'react';

interface AdBannerProps {
  variant?: 'leaderboard' | 'rectangle' | 'inline';
}

export default function AdBanner({ variant = 'leaderboard' }: AdBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  if (variant === 'rectangle') {
    return (
      <div className="relative w-[300px] rounded-2xl overflow-hidden border border-[#e50914]/20 bg-gradient-to-br from-[#1a0a0a] to-[#0d0d0d]">
        <span className="absolute top-2 left-2 text-[9px] text-gray-700 uppercase tracking-widest">Sponsored</span>
        <button onClick={() => setDismissed(true)} className="absolute top-1.5 right-1.5 text-gray-700 hover:text-gray-500"><X size={12} /></button>
        <div className="px-5 py-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#e50914] to-red-800 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-red-900/40">
            <Crown size={26} className="text-[#f5c518]" />
          </div>
          <p className="text-white font-black text-lg mb-1">PlayMax+</p>
          <p className="text-gray-400 text-xs mb-4 leading-relaxed">Go ad-free with HD quality streaming from just ₦2,000/week</p>
          <Link to="/premium" className="block w-full bg-[#e50914] text-white text-sm font-black py-2.5 rounded-xl hover:bg-red-700 transition-colors shadow-lg">
            Upgrade Now
          </Link>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="relative w-full rounded-2xl overflow-hidden border border-gray-800/60 bg-gradient-to-r from-[#111] via-[#161616] to-[#111] my-8">
        <span className="absolute top-2 right-10 text-[9px] text-gray-700 uppercase tracking-widest">Ad</span>
        <button onClick={() => setDismissed(true)} className="absolute top-2 right-2 text-gray-700 hover:text-gray-500"><X size={13} /></button>
        <div className="px-6 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e50914] to-red-800 flex items-center justify-center flex-shrink-0">
            <Crown size={18} className="text-[#f5c518]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-sm">Upgrade to PlayMax+ — Watch Everything Ad-Free</p>
            <p className="text-gray-500 text-xs">HD/Ultra HD quality · Offline downloads · ₦2,000/week</p>
          </div>
          <Link to="/premium" className="flex-shrink-0 bg-[#e50914] text-white text-xs font-black px-4 py-2 rounded-xl hover:bg-red-700 transition-colors">
            Get Premium
          </Link>
        </div>
      </div>
    );
  }

  // Leaderboard
  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-gray-800/50 bg-gradient-to-r from-[#0f0f0f] to-[#161616] my-6">
      <span className="absolute top-2 right-10 text-[9px] text-gray-700 uppercase tracking-widest">Advertisement</span>
      <button onClick={() => setDismissed(true)} className="absolute top-2 right-2 text-gray-700 hover:text-gray-500"><X size={13} /></button>
      <div className="flex items-center gap-5 px-6 py-4">
        <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-gradient-to-br from-[#e50914] to-red-900 items-center justify-center flex-shrink-0 shadow-lg">
          <span className="text-white text-xl font-black">P</span>
        </div>
        <div className="flex-1">
          <p className="text-white font-black text-sm sm:text-base">Stream Movies, Shows & Anime Without Ads — Join PlayMax+ Today</p>
          <p className="text-gray-500 text-xs mt-0.5">Starting at ₦2,000/week · Cancel anytime</p>
        </div>
        <Link to="/premium" className="flex-shrink-0 bg-gradient-to-r from-[#e50914] to-red-700 text-white text-xs sm:text-sm font-black px-5 py-2.5 rounded-xl hover:from-red-600 hover:to-red-800 transition-all shadow-lg">
          Get PlayMax+
        </Link>
      </div>
    </div>
  );
}

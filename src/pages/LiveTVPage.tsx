import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AdBanner from '@/components/features/AdBanner';
import VideoPlayer from '@/components/features/VideoPlayer';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { Crown, Radio, Tv, Globe, Zap, AlertCircle } from 'lucide-react';

// SVG channel icon
const LiveDot = () => (
  <span className="inline-flex items-center gap-1.5">
    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
    <span className="text-red-400 text-xs font-black uppercase tracking-wider">LIVE</span>
  </span>
);

interface Channel {
  id: string;
  name: string;
  category: string;
  logo: string;
  streamUrl: string;
  country: string;
  language: string;
}

// Public free M3U8 streams (legal demo streams)
const CHANNELS: Channel[] = [
  {
    id: 'nasa',
    name: 'NASA TV',
    category: 'Science',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/NASA_logo.svg/200px-NASA_logo.svg.png',
    streamUrl: 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
    country: 'USA',
    language: 'English',
  },
  {
    id: 'bloomberg',
    name: 'Bloomberg TV',
    category: 'News',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Bloomberg_Television_logo.svg/200px-Bloomberg_Television_logo.svg.png',
    streamUrl: 'https://bloombmobile.akamaized.net/hls/live/571329/bloombmobile/master.m3u8',
    country: 'USA',
    language: 'English',
  },
  {
    id: 'dw-english',
    name: 'DW News English',
    category: 'News',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/DW_logo_2012.svg/200px-DW_logo_2012.svg.png',
    streamUrl: 'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8',
    country: 'Germany',
    language: 'English',
  },
  {
    id: 'ard-das-erste',
    name: 'ARD Das Erste',
    category: 'General',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/ARD_Logo_2019.svg/200px-ARD_Logo_2019.svg.png',
    streamUrl: 'https://mcdn.daserste.de/daserste/de/master.m3u8',
    country: 'Germany',
    language: 'German',
  },
  {
    id: 'france24-en',
    name: 'France 24 English',
    category: 'News',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/France24_2013.svg/200px-France24_2013.svg.png',
    streamUrl: 'https://stream.france24.com/hls/live/2037026/F24_EN_LO_HLS/master.m3u8',
    country: 'France',
    language: 'English',
  },
  {
    id: 'al-jazeera',
    name: 'Al Jazeera English',
    category: 'News',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/Al_Jazeera_English.svg/200px-Al_Jazeera_English.svg.png',
    streamUrl: 'https://live-hls-web-aje.getaj.net/AJE/01.m3u8',
    country: 'Qatar',
    language: 'English',
  },
  {
    id: 'tv5monde',
    name: 'TV5Monde',
    category: 'Entertainment',
    logo: 'https://upload.wikimedia.org/wikipedia/fr/thumb/6/6e/Logo_TV5Monde.svg/200px-Logo_TV5Monde.svg.png',
    streamUrl: 'https://tv5monde-live.akamaized.net/hls/live/2007188/tv5mondeplus/master.m3u8',
    country: 'France',
    language: 'French',
  },
  {
    id: 'euronews',
    name: 'Euronews',
    category: 'News',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Euronews_logo_%28flat%29.svg/200px-Euronews_logo_%28flat%29.svg.png',
    streamUrl: 'https://euronews-euronews-1-eu.samsung.wurl.tv/manifest/playlist.m3u8',
    country: 'Europe',
    language: 'English',
  },
];

const CATEGORIES = ['All', 'News', 'Entertainment', 'Science', 'General', 'Sports'];

export default function LiveTVPage() {
  const { profile } = useAuth();
  const isPremium = (profile?.is_premium as boolean) || false;
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = activeCategory === 'All' ? CHANNELS : CHANNELS.filter(c => c.category === activeCategory);

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <Navbar />
      <main className="pt-[68px] pb-12">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center gap-3 py-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center shadow-lg">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M21 6H3a2 2 0 00-2 2v9a2 2 0 002 2h18a2 2 0 002-2V8a2 2 0 00-2-2z" fill="#fff" fillOpacity="0.15" stroke="#fff" strokeWidth="1.5"/>
                <circle cx="12" cy="12" r="3" fill="#e50914"/>
                <path d="M1 10h22M1 14h22" stroke="#fff" strokeWidth="0.5" strokeOpacity="0.3"/>
              </svg>
            </div>
            <div>
              <h1 className="text-white text-2xl font-black flex items-center gap-2">Live TV <LiveDot /></h1>
              <p className="text-gray-600 text-sm">Free international channels streaming now</p>
            </div>
          </div>

          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 text-sm font-semibold px-4 py-2 rounded-xl border transition-all ${activeCategory === cat ? 'bg-red-600/20 border-red-600/60 text-red-400' : 'bg-[#1a1a1a] border-gray-800 text-gray-500 hover:text-white hover:border-gray-600'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Player */}
          {selectedChannel && (
            <div className="mb-8">
              <div className="bg-[#141414] rounded-2xl overflow-hidden border border-gray-800/50">
                <div className="flex items-center gap-3 p-4 border-b border-gray-800/50">
                  <div className="w-10 h-10 rounded-xl bg-gray-900 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    <img src={selectedChannel.logo} alt={selectedChannel.name} className="w-8 h-8 object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
                  </div>
                  <div>
                    <p className="text-white font-black text-sm flex items-center gap-2">{selectedChannel.name} <LiveDot /></p>
                    <p className="text-gray-600 text-xs">{selectedChannel.category} · {selectedChannel.country} · {selectedChannel.language}</p>
                  </div>
                </div>
                <VideoPlayer src={selectedChannel.streamUrl} title={`${selectedChannel.name} — LIVE`} />
                {!isPremium && <div className="p-4"><AdBanner variant="leaderboard" /></div>}
              </div>
            </div>
          )}

          {/* Info */}
          {!selectedChannel && (
            <div className="bg-[#141414] border border-gray-800/40 rounded-2xl p-6 mb-8 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertCircle size={18} className="text-blue-400" />
              </div>
              <div>
                <p className="text-white font-bold text-sm mb-1">Select a channel to start watching</p>
                <p className="text-gray-500 text-xs leading-relaxed">All channels stream live via HLS. Some may buffer briefly on first load. PlayMax+ members get ad-free viewing.</p>
              </div>
            </div>
          )}

          {/* Channel Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-4 mb-8">
            {filtered.map(channel => (
              <button
                key={channel.id}
                onClick={() => setSelectedChannel(channel)}
                className={`group text-left bg-[#141414] rounded-2xl p-4 border transition-all hover:-translate-y-1 hover:shadow-xl ${selectedChannel?.id === channel.id ? 'border-red-600/60 bg-red-950/20 shadow-lg shadow-red-900/20' : 'border-gray-800/60 hover:border-gray-700'}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img
                      src={channel.logo}
                      alt={channel.name}
                      className="w-10 h-10 object-contain"
                      onError={e => {
                        (e.currentTarget as HTMLImageElement).src = '';
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                        const parent = (e.currentTarget as HTMLImageElement).parentElement;
                        if (parent) parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-gray-400 text-xs font-black">${channel.name[0]}</div>`;
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-black truncate">{channel.name}</p>
                    <span className="inline-block text-[10px] text-gray-500 bg-gray-800/60 px-2 py-0.5 rounded-full mt-0.5">{channel.category}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-gray-600 text-xs">
                    <Globe size={10} />
                    <span>{channel.language}</span>
                  </div>
                  <LiveDot />
                </div>

                <div className={`mt-3 w-full py-1.5 rounded-xl text-xs font-black text-center transition-all ${selectedChannel?.id === channel.id ? 'bg-red-600 text-white' : 'bg-gray-800/80 text-gray-500 group-hover:bg-gray-700 group-hover:text-white'}`}>
                  {selectedChannel?.id === channel.id ? '▶ Watching' : 'Watch Live'}
                </div>
              </button>
            ))}
          </div>

          {/* Premium promo for live TV */}
          {!isPremium && (
            <div className="bg-gradient-to-r from-[#1a0505] via-[#1a0a00] to-[#0d0d0d] border border-[#e50914]/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#f5c518] to-yellow-600 flex items-center justify-center flex-shrink-0">
                  <Crown size={22} className="text-black" />
                </div>
                <div>
                  <p className="text-white font-black text-base mb-1">PlayMax+ Live TV</p>
                  <p className="text-gray-500 text-sm">Upgrade for ad-free live TV, HD quality, and 100+ premium channels</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Tv size={10} /> 100+ Channels</span>
                    <span className="flex items-center gap-1"><Zap size={10} /> Ad-Free</span>
                    <span className="flex items-center gap-1"><Radio size={10} /> HD/4K</span>
                  </div>
                </div>
              </div>
              <Link to="/premium" className="flex-shrink-0 bg-[#e50914] text-white font-black px-7 py-3 rounded-xl hover:bg-red-700 transition-all text-sm">
                Upgrade Now
              </Link>
            </div>
          )}

          <div className="mt-6">
            <AdBanner variant="leaderboard" />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

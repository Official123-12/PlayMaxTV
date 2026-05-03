import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import VideoPlayer from '@/components/features/VideoPlayer';
import { useAuth } from '@/hooks/useAuth';
import { Crown, Users, Copy, Check, Send, Play, Link as LinkIcon, Tv } from 'lucide-react';
import { toast } from 'sonner';

interface PartyMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  sentAt: string;
}

interface PartyState {
  hostId: string;
  movieId: string;
  movieTitle: string;
  movieCover: string;
  subjectType: string;
  streamUrl: string;
  currentTime: number;
  isPlaying: boolean;
  updatedAt: string;
  members: string[];
  messages: PartyMessage[];
}

const PARTY_PREFIX = 'pm_party_';
const POLL_INTERVAL = 3000;

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getParty(roomId: string): PartyState | null {
  try { return JSON.parse(localStorage.getItem(PARTY_PREFIX + roomId) || 'null'); } catch { return null; }
}

function setParty(roomId: string, state: PartyState) {
  localStorage.setItem(PARTY_PREFIX + roomId, JSON.stringify(state));
}

export default function WatchPartyPage() {
  const { session, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isPremium = (profile?.is_premium as boolean) || (() => {
    const e = localStorage.getItem('playmax_ad_premium');
    return e ? new Date(e) > new Date() : false;
  })();

  const [mode, setMode] = useState<'lobby' | 'host' | 'join' | 'party'>('lobby');
  const [roomId, setRoomId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [movieSearch, setMovieSearch] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [movieTitle, setMovieTitle] = useState('');
  const [partyState, setPartyState] = useState<PartyState | null>(null);
  const [chatMsg, setChatMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [synced, setSynced] = useState(true);
  const lastSyncTime = useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const userName = (profile?.display_name as string) || session?.user?.email?.split('@')[0] || 'Guest';
  const userId = session?.user?.id || 'anonymous';

  // Check URL for room code
  useEffect(() => {
    const room = searchParams.get('room');
    if (room) { setJoinCode(room); setMode('join'); }
  }, [searchParams]);

  // Polling
  useEffect(() => {
    if (mode !== 'party' || !roomId) return;
    const poll = setInterval(() => {
      const state = getParty(roomId);
      if (!state) return;
      setPartyState(state);
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });

      // Sync time if host
      if (state.hostId !== userId) {
        const diff = Math.abs((state.currentTime || 0) - lastSyncTime.current);
        setSynced(diff < 5);
      }
    }, POLL_INTERVAL);
    return () => clearInterval(poll);
  }, [mode, roomId, userId]);

  const handleCreateParty = () => {
    if (!session) { navigate('/login'); return; }
    if (!isPremium) return;
    const id = generateRoomId();
    setRoomId(id);
    setMode('host');
  };

  const handleStartParty = () => {
    if (!movieTitle && !streamUrl) { toast.error('Enter a movie title or stream URL'); return; }
    const state: PartyState = {
      hostId: userId,
      movieId: '',
      movieTitle: movieTitle || 'Watch Party',
      movieCover: '',
      subjectType: '1',
      streamUrl,
      currentTime: 0,
      isPlaying: false,
      updatedAt: new Date().toISOString(),
      members: [userName],
      messages: [{
        id: Date.now().toString(),
        userId,
        userName,
        text: `🎬 ${userName} created this Watch Party! Share the code: ${roomId}`,
        sentAt: new Date().toISOString(),
      }],
    };
    setParty(roomId, state);
    setPartyState(state);
    setMode('party');
    toast.success(`Party room ${roomId} created!`);
  };

  const handleJoinParty = () => {
    if (!joinCode.trim()) { toast.error('Enter a room code'); return; }
    const code = joinCode.trim().toUpperCase();
    const state = getParty(code);
    if (!state) { toast.error('Room not found. Check the code and try again.'); return; }
    // Join
    if (!state.members.includes(userName)) {
      state.members.push(userName);
      state.messages.push({
        id: Date.now().toString(),
        userId,
        userName: 'System',
        text: `👋 ${userName} joined the party!`,
        sentAt: new Date().toISOString(),
      });
      setParty(code, state);
    }
    setRoomId(code);
    setPartyState(state);
    setStreamUrl(state.streamUrl);
    setMovieTitle(state.movieTitle);
    setMode('party');
    toast.success(`Joined party ${code}!`);
  };

  const handleSendChat = useCallback(() => {
    if (!chatMsg.trim() || !roomId) return;
    const state = getParty(roomId);
    if (!state) return;
    state.messages.push({
      id: Date.now().toString(),
      userId,
      userName,
      text: chatMsg.trim(),
      sentAt: new Date().toISOString(),
    });
    if (state.messages.length > 100) state.messages = state.messages.slice(-100);
    setParty(roomId, state);
    setPartyState({ ...state });
    setChatMsg('');
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [chatMsg, roomId, userId, userName]);

  const handleTimeSync = useCallback((currentTime: number) => {
    if (!roomId || partyState?.hostId !== userId) return;
    lastSyncTime.current = currentTime;
    const state = getParty(roomId);
    if (!state) return;
    if (Math.abs((state.currentTime || 0) - currentTime) > 2) {
      state.currentTime = currentTime;
      state.updatedAt = new Date().toISOString();
      setParty(roomId, state);
    }
  }, [roomId, userId, partyState?.hostId]);

  const copyLink = () => {
    const url = `${window.location.origin}/party?room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Party link copied!');
  };

  const isHost = partyState?.hostId === userId;

  // ─── Lobby ────────────────────────────────────────────────────────────────
  if (mode === 'lobby') {
    return (
      <div className="min-h-screen bg-[#0d0d0d]">
        <Navbar />
        <main className="pt-[68px] pb-16">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
            <div className="text-center mb-12">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center mb-6 shadow-2xl shadow-purple-900/40">
                <Users size={36} className="text-white" />
              </div>
              <h1 className="text-white text-4xl font-black mb-3">Watch Party</h1>
              <p className="text-gray-500 text-base">Watch movies in sync with friends — chat in real-time</p>
            </div>

            {!isPremium ? (
              <div className="bg-gradient-to-br from-[#1a0005] to-[#141414] border border-[#e50914]/30 rounded-3xl p-8 text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#f5c518] to-yellow-600 flex items-center justify-center mb-4">
                  <Crown size={28} className="text-black" />
                </div>
                <h2 className="text-white font-black text-2xl mb-2">PlayMax+ Required</h2>
                <p className="text-gray-500 text-sm mb-6">Watch Party is a premium feature. Upgrade to watch with friends in sync.</p>
                <Link to="/premium" className="inline-block bg-[#e50914] text-white font-black px-8 py-3.5 rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-900/30">
                  Upgrade to PlayMax+
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={handleCreateParty}
                  className="w-full flex items-center gap-4 bg-gradient-to-r from-purple-600/20 to-purple-900/10 border-2 border-purple-600/40 hover:border-purple-500 rounded-2xl p-5 text-left transition-all group"
                >
                  <div className="w-14 h-14 rounded-xl bg-purple-600/30 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-600/50 transition-colors">
                    <Play size={24} className="text-purple-300" />
                  </div>
                  <div>
                    <p className="text-white font-black text-lg">Create a Party</p>
                    <p className="text-gray-500 text-sm">Start watching and invite your friends</p>
                  </div>
                </button>

                <div className="bg-[#141414] border border-gray-800/40 rounded-2xl p-5">
                  <p className="text-white font-black mb-3 flex items-center gap-2">
                    <LinkIcon size={16} className="text-purple-400" /> Join a Party
                  </p>
                  <div className="flex gap-3">
                    <input
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="Enter room code (e.g. AB1234)"
                      className="flex-1 bg-[#1a1a1a] border border-gray-700/60 text-white px-4 py-3 rounded-xl font-mono font-bold uppercase focus:outline-none focus:border-purple-500 transition-colors placeholder:text-gray-700 placeholder:font-normal placeholder:normal-case"
                      maxLength={6}
                      onKeyDown={e => e.key === 'Enter' && handleJoinParty()}
                    />
                    <button
                      onClick={handleJoinParty}
                      className="bg-purple-600 text-white font-black px-6 py-3 rounded-xl hover:bg-purple-500 transition-colors"
                    >
                      Join
                    </button>
                  </div>
                </div>

                {/* Features */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {[
                    { icon: Users, label: 'Sync Playback', desc: 'All in perfect sync' },
                    { icon: Send, label: 'Live Chat', desc: 'React together' },
                    { icon: Tv, label: 'Any Content', desc: 'Movies & TV shows' },
                  ].map(({ icon: Icon, label, desc }) => (
                    <div key={label} className="bg-[#141414] rounded-xl p-3 border border-gray-800/40 text-center">
                      <Icon size={20} className="text-purple-400 mx-auto mb-2" />
                      <p className="text-white text-xs font-bold">{label}</p>
                      <p className="text-gray-600 text-[10px] mt-0.5">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ─── Host Setup ───────────────────────────────────────────────────────────
  if (mode === 'host') {
    return (
      <div className="min-h-screen bg-[#0d0d0d]">
        <Navbar />
        <main className="pt-[68px] pb-16">
          <div className="max-w-xl mx-auto px-4 sm:px-6 py-12">
            <div className="bg-[#141414] rounded-3xl p-6 border border-purple-800/30 shadow-2xl shadow-purple-900/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-purple-600/20 flex items-center justify-center">
                  <Users size={22} className="text-purple-400" />
                </div>
                <div>
                  <h2 className="text-white font-black text-xl">Room {roomId}</h2>
                  <p className="text-purple-400 text-xs font-semibold">Share this code with friends</p>
                </div>
                <button onClick={copyLink} className="ml-auto flex items-center gap-1.5 text-sm bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 px-3 py-2 rounded-xl transition-colors font-semibold">
                  {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy Link</>}
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Movie / Show Title</label>
                  <input
                    value={movieTitle}
                    onChange={e => setMovieTitle(e.target.value)}
                    placeholder="What are you watching?"
                    className="w-full bg-[#1a1a1a] border border-gray-700/60 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Stream URL (optional)</label>
                  <input
                    value={streamUrl}
                    onChange={e => setStreamUrl(e.target.value)}
                    placeholder="https://... (m3u8 or mp4 link)"
                    className="w-full bg-[#1a1a1a] border border-gray-700/60 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-purple-500 transition-colors font-mono text-sm"
                  />
                  <p className="text-gray-700 text-xs mt-1.5">Or browse to a movie and copy its stream URL from the watch page</p>
                </div>

                <div className="bg-purple-950/20 border border-purple-800/30 rounded-xl p-3 text-xs text-purple-400">
                  Friends joining with code <span className="font-black">{roomId}</span> will sync to your playback automatically.
                </div>

                <button
                  onClick={handleStartParty}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black py-3.5 rounded-2xl transition-colors shadow-lg shadow-purple-900/30 text-base"
                >
                  Start Party Room
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ─── Party Room ───────────────────────────────────────────────────────────
  if (mode === 'party' && partyState) {
    return (
      <div className="min-h-screen bg-[#0d0d0d]">
        <Navbar />
        <main className="pt-[68px] pb-0">
          <div className="grid grid-cols-1 xl:grid-cols-4 h-[calc(100vh-68px)]">
            {/* Video side */}
            <div className="xl:col-span-3 flex flex-col overflow-y-auto">
              <div className="p-4 pb-0">
                {/* Room bar */}
                <div className="flex items-center justify-between mb-3 bg-[#141414] rounded-2xl px-4 py-2.5 border border-gray-800/40">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                    <span className="text-purple-400 text-sm font-black">Room {roomId}</span>
                    <span className="text-gray-600 text-xs">· {partyState.members.length} watching</span>
                    {isHost && <span className="text-[10px] bg-purple-600/20 text-purple-400 px-2 py-0.5 rounded-full font-black">HOST</span>}
                    {!isHost && !synced && <span className="text-[10px] bg-orange-600/20 text-orange-400 px-2 py-0.5 rounded-full font-black">SYNCING...</span>}
                  </div>
                  <button onClick={copyLink} className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors">
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied' : 'Invite'}
                  </button>
                </div>

                {/* Player */}
                {partyState.streamUrl ? (
                  <VideoPlayer
                    src={partyState.streamUrl}
                    title={partyState.movieTitle}
                    startTime={!isHost ? partyState.currentTime : 0}
                    onTimeUpdate={(t) => handleTimeSync(t)}
                  />
                ) : (
                  <div className="w-full aspect-video bg-[#141414] rounded-2xl border border-gray-800/40 flex flex-col items-center justify-center gap-3">
                    <Tv size={40} className="text-gray-700" />
                    <p className="text-gray-500 font-semibold text-sm">Waiting for host to share a stream</p>
                  </div>
                )}

                <div className="mt-3 px-1">
                  <p className="text-white font-black text-lg">{partyState.movieTitle}</p>
                  <p className="text-gray-600 text-xs mt-0.5">
                    Hosted by {isHost ? 'you' : partyState.members[0]} · {partyState.members.length} member{partyState.members.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Chat sidebar */}
            <div className="xl:col-span-1 border-l border-gray-800/40 flex flex-col bg-[#0f0f0f]">
              <div className="p-4 border-b border-gray-800/40">
                <h3 className="text-white font-black text-sm flex items-center gap-2">
                  <Send size={14} className="text-purple-400" /> Party Chat
                </h3>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {partyState.members.map(m => (
                    <span key={m} className="text-[10px] bg-purple-600/15 border border-purple-800/30 text-purple-400 px-2 py-0.5 rounded-full">{m}</span>
                  ))}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {partyState.messages.map(msg => (
                  <div key={msg.id} className={`${msg.userId === userId ? 'text-right' : ''}`}>
                    {msg.userName === 'System' ? (
                      <p className="text-center text-gray-700 text-xs italic py-1">{msg.text}</p>
                    ) : (
                      <>
                        <p className="text-gray-600 text-[10px] mb-0.5">{msg.userName}</p>
                        <div className={`inline-block max-w-[85%] px-3 py-2 rounded-2xl text-sm ${msg.userId === userId ? 'bg-purple-600/30 text-white rounded-br-none' : 'bg-[#1a1a1a] text-gray-300 rounded-bl-none'}`}>
                          {msg.text}
                        </div>
                      </>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-gray-800/40">
                <div className="flex gap-2">
                  <input
                    value={chatMsg}
                    onChange={e => setChatMsg(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                    placeholder="Say something..."
                    className="flex-1 bg-[#1a1a1a] border border-gray-700/40 text-white text-sm px-3 py-2 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  <button
                    onClick={handleSendChat}
                    className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center hover:bg-purple-500 transition-colors flex-shrink-0"
                  >
                    <Send size={14} className="text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return null;
}

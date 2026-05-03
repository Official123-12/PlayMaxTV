import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, Crown, Shield, ArrowRight, KeyRound } from 'lucide-react';
import { signIn, sendOtp, verifyOtpAndLogin, setCurrentUser } from '@/lib/auth';
import { fetchUserProfile } from '@/lib/db';
import { toast } from 'sonner';

const PlayMaxLogo = () => (
  <svg width="200" height="48" viewBox="0 0 220 50" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="lgLogin2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ff1a2e" /><stop offset="100%" stopColor="#cc0010" />
      </linearGradient>
    </defs>
    <circle cx="25" cy="25" r="23" fill="url(#lgLogin2)" />
    <polygon points="20,15 20,35 36,25" fill="white" />
    <text x="57" y="34" fontFamily="'Inter','Arial Black',sans-serif" fontWeight="900" fontSize="26" fill="white">PLAY</text>
    <text x="123" y="34" fontFamily="'Inter','Arial Black',sans-serif" fontWeight="900" fontSize="26" fill="#ff1a2e">MA</text>
    <text x="167" y="34" fontFamily="'Inter','Arial Black',sans-serif" fontWeight="900" fontSize="26" fill="#ff1a2e" stroke="#ff1a2e" strokeWidth="0.5">X</text>
    <rect x="194" y="10" width="24" height="17" rx="4" fill="#f5c518" />
    <text x="198" y="23" fontFamily="'Inter','Arial Black',sans-serif" fontWeight="900" fontSize="11" fill="#000">TV</text>
  </svg>
);

type LoginMode = 'password' | 'otp';

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const finishLogin = async (userId: string, userEmail: string) => {
    const p = await fetchUserProfile(userId);
    setCurrentUser({
      id: userId,
      name: (p?.display_name as string) || userEmail.split('@')[0],
      email: userEmail,
      isPremium: (p?.is_premium as boolean) || false,
      premiumPlan: (p?.premium_plan as string) || undefined,
      watchHistory: [],
      watchlist: [],
    });
    toast.success('Welcome back!');
    navigate('/');
    window.location.reload();
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await signIn(email.trim(), password);
      await finishLogin(data.user.id, data.user.email || '');
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Invalid email or password');
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error('Enter your email first'); return; }
    setLoading(true);
    try {
      await sendOtp(email.trim());
      setOtpSent(true);
      toast.success('Verification code sent!');
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 4) { toast.error('Enter the 4-digit code'); return; }
    setLoading(true);
    try {
      const data = await verifyOtpAndLogin(email.trim(), otp);
      if (data.session?.user) {
        await finishLogin(data.session.user.id, data.session.user.email || '');
      } else {
        toast.error('Login failed. Try again.');
        setLoading(false);
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Invalid verification code');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&q=80" alt="Cinema" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/88 to-black/50" />
        <div className="absolute inset-0 flex flex-col items-start justify-center p-16">
          <PlayMaxLogo />
          <h2 className="text-white text-4xl font-black mt-10 mb-4 leading-tight">Stream Everything<br /><span className="text-[#e50914]">You Love</span></h2>
          <p className="text-gray-400 max-w-sm leading-relaxed text-lg">Movies, TV Shows, Sports, Cartoons, and Anime — all in one dark cinematic experience.</p>
          <div className="mt-10 space-y-3">
            {['10,000+ Movies & Shows', 'Live Sports Scores', 'Anime & Cartoons', 'HD/4K Premium Content'].map(f => (
              <div key={f} className="flex items-center gap-3 text-gray-300">
                <div className="w-5 h-5 rounded-full bg-[#e50914]/20 border border-[#e50914]/40 flex items-center justify-center flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#e50914]" />
                </div>
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#0a0a0a]">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-10"><PlayMaxLogo /></div>

          {/* PlayMax Auth badge */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-lg bg-[#e50914]/15 border border-[#e50914]/30 flex items-center justify-center">
              <Shield size={14} className="text-[#e50914]" />
            </div>
            <span className="text-gray-500 text-xs font-semibold">PlayMax Auth — Secure Sign In</span>
          </div>

          <h1 className="text-white text-3xl font-black mb-1">Welcome back</h1>
          <p className="text-gray-600 text-sm mb-6">Sign in to your PlayMax TV account</p>

          {/* Mode toggle */}
          <div className="flex gap-1 bg-[#111] border border-gray-800/60 p-1 rounded-xl mb-6">
            <button onClick={() => { setMode('password'); setOtpSent(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'password' ? 'bg-[#1e1e1e] text-white' : 'text-gray-500 hover:text-gray-300'}`}>
              <Lock size={14} /> Password
            </button>
            <button onClick={() => { setMode('otp'); setOtpSent(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'otp' ? 'bg-[#1e1e1e] text-white' : 'text-gray-500 hover:text-gray-300'}`}>
              <KeyRound size={14} /> Email Code
            </button>
          </div>

          {/* Password login */}
          {mode === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2 font-medium">Email address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com"
                    className="w-full bg-[#1a1a1a] border border-gray-800 text-white placeholder-gray-700 pl-10 pr-4 py-3.5 rounded-xl focus:outline-none focus:border-[#e50914] transition-colors font-medium" />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2 font-medium">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    required placeholder="Your password"
                    className="w-full bg-[#1a1a1a] border border-gray-800 text-white placeholder-gray-700 pl-10 pr-12 py-3.5 rounded-xl focus:outline-none focus:border-[#e50914] transition-colors font-medium" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-[#e50914] text-white font-black py-3.5 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all shadow-lg shadow-red-900/20">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* OTP login */}
          {mode === 'otp' && (
            <div className="space-y-4">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2 font-medium">Email address</label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com"
                        className="w-full bg-[#1a1a1a] border border-gray-800 text-white placeholder-gray-700 pl-10 pr-4 py-3.5 rounded-xl focus:outline-none focus:border-[#e50914] transition-colors font-medium" />
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full bg-[#e50914] text-white font-black py-3.5 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                    {loading ? 'Sending...' : <><span>Send Code</span> <ArrowRight size={16} /></>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleOtpLogin} className="space-y-4">
                  <div className="bg-[#141414] border border-gray-800 rounded-2xl p-4">
                    <p className="text-gray-400 text-sm">Code sent to</p>
                    <p className="text-white font-bold text-sm mt-0.5">{email}</p>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2 font-medium">Enter 4-digit code</label>
                    <input type="text" inputMode="numeric" maxLength={4} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="0000" autoFocus
                      className="w-full bg-[#1a1a1a] border border-gray-800 text-white placeholder-gray-700 px-4 py-4 rounded-xl focus:outline-none focus:border-[#e50914] font-black text-2xl text-center tracking-[0.5em]" />
                  </div>
                  <button type="submit" disabled={loading || otp.length !== 4}
                    className="w-full bg-[#e50914] text-white font-black py-3.5 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all">
                    {loading ? 'Verifying...' : 'Sign In'}
                  </button>
                  <button type="button" onClick={() => setOtpSent(false)} className="w-full text-gray-600 text-sm hover:text-gray-400">
                    Change email
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="mt-5 text-center">
            <p className="text-gray-700 text-sm">
              No account?{' '}
              <Link to="/register" className="text-[#e50914] hover:text-red-400 font-bold">Create one free</Link>
            </p>
          </div>

          <div className="mt-8 p-4 bg-[#141414] rounded-2xl border border-gray-800/60">
            <div className="flex items-center gap-2 mb-1.5">
              <Crown size={13} className="text-[#f5c518]" />
              <span className="text-[#f5c518] text-xs font-black">PlayMax+ Members</span>
            </div>
            <p className="text-gray-600 text-xs leading-relaxed">Ad-free streaming, HD quality, and exclusive content. <Link to="/premium" className="text-[#e50914]">Upgrade now →</Link></p>
          </div>

          <p className="text-center text-gray-800 text-xs mt-8">Made by <span className="text-gray-600">Damini × Nicky Tech</span></p>
        </div>
      </div>
    </div>
  );
}

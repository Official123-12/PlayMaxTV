import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, Crown, Shield, ArrowRight, CheckCircle } from 'lucide-react';
import { sendOtp, verifyOtpAndRegister, setCurrentUser } from '@/lib/auth';
import { toast } from 'sonner';

const PlayMaxLogo = () => (
  <svg width="200" height="48" viewBox="0 0 220 50" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="lgReg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ff1a2e" /><stop offset="100%" stopColor="#cc0010" />
      </linearGradient>
    </defs>
    <circle cx="25" cy="25" r="23" fill="url(#lgReg)" />
    <polygon points="20,15 20,35 36,25" fill="white" />
    <text x="57" y="34" fontFamily="'Inter','Arial Black',sans-serif" fontWeight="900" fontSize="26" fill="white">PLAY</text>
    <text x="123" y="34" fontFamily="'Inter','Arial Black',sans-serif" fontWeight="900" fontSize="26" fill="#ff1a2e">MA</text>
    <text x="167" y="34" fontFamily="'Inter','Arial Black',sans-serif" fontWeight="900" fontSize="26" fill="#ff1a2e" stroke="#ff1a2e" strokeWidth="0.5">X</text>
    <rect x="194" y="10" width="24" height="17" rx="4" fill="#f5c518" />
    <text x="198" y="23" fontFamily="'Inter','Arial Black',sans-serif" fontWeight="900" fontSize="11" fill="#000">TV</text>
  </svg>
);

// Step indicator
function Steps({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${s < step ? 'bg-[#e50914] text-white' : s === step ? 'bg-[#e50914] text-white ring-4 ring-[#e50914]/20' : 'bg-gray-800 text-gray-600'}`}>
            {s < step ? <CheckCircle size={14} /> : s}
          </div>
          {s < 3 && <div className={`h-0.5 w-8 rounded transition-all ${s < step ? 'bg-[#e50914]' : 'bg-gray-800'}`} />}
        </div>
      ))}
      <span className="text-gray-500 text-xs ml-2">
        {step === 1 ? 'Your details' : step === 2 ? 'Verify email' : 'Set password'}
      </span>
    </div>
  );
}

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const navigate = useNavigate();

  // Step 1: collect name + email, send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Please enter your name'); return; }
    if (!agreed) { toast.error('Please agree to our terms'); return; }
    setLoading(true);
    try {
      await sendOtp(email.trim());
      toast.success('Verification code sent to your email!');
      setStep(2);
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: verify OTP — move to step 3
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 4) { toast.error('Enter the 4-digit code from your email'); return; }
    setStep(3);
  };

  // Step 3: set password and complete
  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const user = await verifyOtpAndRegister(email.trim(), otp, password, name.trim());
      setCurrentUser({
        id: user?.id || '',
        name: name.trim(),
        email: email.trim(),
        isPremium: false,
        watchHistory: [],
        watchlist: [],
      });
      toast.success(`Welcome to PlayMax TV, ${name.trim()}!`);
      navigate('/');
      window.location.reload();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Registration failed. Check your code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex">
      {/* Left branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src="https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1200&q=80" alt="Movies" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/88 to-black/50" />
        <div className="absolute inset-0 flex flex-col items-start justify-center p-16">
          <PlayMaxLogo />
          <h2 className="text-white text-4xl font-black mt-10 mb-4 leading-tight">
            Join PlayMax TV<br /><span className="text-[#e50914]">For Free</span>
          </h2>
          <p className="text-gray-400 max-w-sm leading-relaxed text-base">
            Create your free account and start watching thousands of movies, shows, sports, and anime instantly.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3 w-full max-w-xs">
            {[
              { icon: '▶', title: 'Free Account', desc: 'Watch with limited ads' },
              { icon: '♛', title: 'PlayMax+', desc: 'Ad-free & HD quality' },
              { icon: '↓', title: 'Downloads', desc: 'Watch offline anytime' },
              { icon: '●', title: 'Watch Party', desc: 'Watch with friends' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/8">
                <span className="text-[#e50914] font-black text-lg">{icon}</span>
                <p className="text-white font-bold text-sm mt-2">{title}</p>
                <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#0a0a0a]">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-8"><PlayMaxLogo /></div>

          {/* PlayMax Auth badge */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-7 h-7 rounded-lg bg-[#e50914]/15 border border-[#e50914]/30 flex items-center justify-center">
              <Shield size={14} className="text-[#e50914]" />
            </div>
            <span className="text-gray-500 text-xs font-semibold">PlayMax Auth — Secure Registration</span>
          </div>

          <h1 className="text-white text-3xl font-black mb-1">Create your account</h1>
          <p className="text-gray-600 text-sm mb-6">It's free — start watching instantly</p>

          <Steps step={step} />

          {/* Step 1 */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2 font-medium">Full name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Your name"
                  className="w-full bg-[#1a1a1a] border border-gray-800 text-white placeholder-gray-700 px-4 py-3.5 rounded-xl focus:outline-none focus:border-[#e50914] transition-colors font-medium" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2 font-medium">Email address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com"
                    className="w-full bg-[#1a1a1a] border border-gray-800 text-white placeholder-gray-700 pl-10 pr-4 py-3.5 rounded-xl focus:outline-none focus:border-[#e50914] transition-colors font-medium" />
                </div>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-1 accent-[#e50914]" />
                <span className="text-gray-600 text-sm">
                  I agree to PlayMax TV's <a href="#" className="text-[#e50914]">Terms</a> and <a href="#" className="text-[#e50914]">Privacy Policy</a>
                </span>
              </label>
              <button type="submit" disabled={loading}
                className="w-full bg-[#e50914] text-white font-black py-3.5 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {loading ? 'Sending code...' : <><span>Continue</span> <ArrowRight size={16} /></>}
              </button>
            </form>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="bg-[#141414] border border-gray-800 rounded-2xl p-4 mb-2">
                <p className="text-gray-400 text-sm">A 4-digit code was sent to</p>
                <p className="text-white font-bold text-sm mt-0.5">{email}</p>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2 font-medium">Verification code</label>
                <input
                  type="text" inputMode="numeric" maxLength={4} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="0000" autoFocus
                  className="w-full bg-[#1a1a1a] border border-gray-800 text-white placeholder-gray-700 px-4 py-4 rounded-xl focus:outline-none focus:border-[#e50914] transition-colors font-black text-2xl text-center tracking-[0.5em]"
                />
                <p className="text-gray-700 text-xs mt-2">Check your inbox and spam folder</p>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-3.5 rounded-xl border border-gray-800 text-gray-400 hover:text-white text-sm font-semibold transition-colors">
                  Back
                </button>
                <button type="submit" disabled={otp.length !== 4}
                  className="flex-1 bg-[#e50914] text-white font-black py-3.5 rounded-xl hover:bg-red-700 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                  Verify <ArrowRight size={16} />
                </button>
              </div>
              <button type="button" onClick={handleSendOtp} disabled={loading} className="w-full text-gray-600 text-sm hover:text-gray-400 transition-colors">
                Resend code
              </button>
            </form>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <form onSubmit={handleComplete} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2 font-medium">Create password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    required placeholder="At least 6 characters" minLength={6}
                    className="w-full bg-[#1a1a1a] border border-gray-800 text-white placeholder-gray-700 pl-10 pr-12 py-3.5 rounded-xl focus:outline-none focus:border-[#e50914] transition-colors font-medium" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2 font-medium">Confirm password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                    required placeholder="Repeat your password"
                    className="w-full bg-[#1a1a1a] border border-gray-800 text-white placeholder-gray-700 pl-10 pr-4 py-3.5 rounded-xl focus:outline-none focus:border-[#e50914] transition-colors font-medium" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-[#e50914] text-white font-black py-3.5 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all">
                {loading ? 'Creating account...' : 'Complete Registration'}
              </button>
            </form>
          )}

          <div className="mt-5 text-center">
            <p className="text-gray-700 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-[#e50914] hover:text-red-400 font-bold">Sign in</Link>
            </p>
          </div>

          <div className="mt-6 p-4 bg-[#141414] rounded-2xl border border-gray-800/60">
            <div className="flex items-center gap-2 mb-1">
              <Crown size={13} className="text-[#f5c518]" />
              <span className="text-[#f5c518] text-xs font-black">PlayMax+ Members</span>
            </div>
            <p className="text-gray-600 text-xs">Ad-free streaming, HD quality, offline downloads. <Link to="/premium" className="text-[#e50914]">Upgrade →</Link></p>
          </div>

          <p className="text-center text-gray-800 text-xs mt-8">Made by <span className="text-gray-600">Damini × Nicky Tech</span></p>
        </div>
      </div>
    </div>
  );
}

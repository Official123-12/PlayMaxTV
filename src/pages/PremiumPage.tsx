import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { SUBSCRIPTION_PLANS, PAYMENT_INFO, PAYSTACK_PUBLIC_KEY } from '@/constants';
import { Crown, Check, Zap, Shield, Download, Users, Star, X, CreditCard, Wallet, Timer, Play } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { toast } from 'sonner';

const PREMIUM_FEATURES = [
  { icon: Zap, title: 'Ad-Free Streaming', desc: 'Watch without interruptions' },
  { icon: Shield, title: 'HD & Ultra HD Quality', desc: 'Crystal clear picture quality' },
  { icon: Download, title: 'Offline Downloads', desc: 'Save to watch without internet' },
  { icon: Users, title: 'Watch Party', desc: 'Watch with friends simultaneously' },
  { icon: Star, title: 'Early Access', desc: 'First to see new releases' },
  { icon: Crown, title: 'Multi-Device', desc: 'Watch on all your screens' },
];

const COMPARISON = [
  ['Feature', 'Free', 'PlayMax+'],
  ['Stream movies & shows', true, true],
  ['Sports coverage', true, true],
  ['Live TV channels', true, true],
  ['Ad-free experience', false, true],
  ['HD/Ultra HD quality', false, true],
  ['Offline downloads', false, true],
  ['Watch party', false, true],
  ['Early access', false, true],
  ['Multiple devices', '1', '4'],
];

function AdVideoOverlay({ onComplete }: { onComplete: () => void }) {
  const [seconds, setSeconds] = useState(30);
  const [canSkip, setCanSkip] = useState(false);
  const [adPlaying, setAdPlaying] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startAd = () => {
    setAdPlaying(true);
    timerRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); setCanSkip(true); return 0; }
        if (prev <= 26) setCanSkip(true);
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#141414] rounded-3xl overflow-hidden border border-gray-800/60">
        <div className="relative w-full aspect-video bg-gradient-to-br from-gray-900 to-[#1a1a1a] flex items-center justify-center">
          {!adPlaying ? (
            <button onClick={startAd} className="w-20 h-20 rounded-full bg-[#e50914] flex items-center justify-center shadow-2xl hover:bg-red-700 transition-colors">
              <Play size={32} fill="white" className="text-white ml-2" />
            </button>
          ) : (
            <>
              <div className="text-center px-8">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#e50914] to-red-800 flex items-center justify-center mb-4">
                  <Crown size={28} className="text-[#f5c518]" />
                </div>
                <p className="text-white font-black text-2xl mb-2">PlayMax TV</p>
                <p className="text-gray-400 text-sm">Your ultimate streaming destination</p>
                <p className="text-[#e50914] text-xs mt-4 font-bold">Advertisement</p>
              </div>
              <div className="absolute top-3 right-3 bg-black/80 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                <Timer size={12} className="text-gray-400" />
                <span className="text-white text-xs font-black">{seconds}s</span>
              </div>
            </>
          )}
        </div>
        <div className="p-5">
          <h3 className="text-white font-black text-base mb-1">
            {!adPlaying ? 'Watch ad to get 24 hours free premium' : 'Watch the ad to unlock your reward'}
          </h3>
          <p className="text-gray-500 text-sm mb-4">
            {!adPlaying ? 'Press play to start the ad.' : `${seconds > 0 ? `${seconds}s remaining` : 'Ad complete!'}`}
          </p>
          <div className="flex gap-3">
            {canSkip ? (
              <button onClick={onComplete}
                className="flex-1 bg-[#e50914] text-white font-black py-3 rounded-2xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2">
                <Crown size={16} /> Claim 24-Hour Premium
              </button>
            ) : (
              <div className="flex-1 bg-gray-800/60 text-gray-600 font-black py-3 rounded-2xl text-center text-sm cursor-not-allowed">
                {!adPlaying ? 'Press play above' : `Available in ${seconds}s...`}
              </div>
            )}
            <button onClick={onComplete} className="px-4 py-3 rounded-2xl border border-gray-800 text-gray-600 hover:text-white text-sm transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PremiumPage() {
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [showAdOverlay, setShowAdOverlay] = useState(false);
  const [searchParams] = useSearchParams();
  const { session, profile } = useAuth();
  const navigate = useNavigate();

  const selected = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan)!;
  const isPremium = (profile?.is_premium as boolean) || false;

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    if (paymentStatus === 'success' && reference) {
      verifyPayment(reference);
    }
  }, [searchParams]);

  const verifyPayment = async (reference: string) => {
    toast.loading('Verifying payment...');
    try {
      const headers: Record<string, string> = {};
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
      const { data, error } = await supabase.functions.invoke('paystack-verify', {
        body: { reference, plan: selectedPlan },
        headers,
      });
      if (error) {
        let msg = error.message;
        if (error instanceof FunctionsHttpError) {
          try { msg = await error.context.text(); } catch { /* ignore */ }
        }
        toast.dismiss();
        toast.error(`Verification failed: ${msg}`);
        return;
      }
      toast.dismiss();
      toast.success(`Payment verified! PlayMax+ ${data?.plan || 'plan'} activated.`);
      window.location.href = '/profile';
    } catch (err) {
      toast.dismiss();
      console.error('Verify error:', err);
    }
  };

  const handlePaystack = async () => {
    if (!session) { navigate('/login'); return; }
    setLoading(true);
    try {
      // Use Paystack inline popup via script
      const callbackUrl = `${window.location.origin}/premium?payment=success`;

      // Try to use Paystack inline if available
      const PaystackPop = (window as unknown as { PaystackPop?: { setup: (config: unknown) => { openIframe: () => void } } }).PaystackPop;

      if (PaystackPop) {
        const handler = PaystackPop.setup({
          key: PAYSTACK_PUBLIC_KEY,
          email: session.user.email,
          amount: selected.price * 100,
          currency: 'NGN',
          ref: `playmax_${Date.now()}`,
          metadata: { plan: selectedPlan, userId: session.user.id },
          callback: async (response: { reference: string }) => {
            await verifyPayment(response.reference);
          },
          onClose: () => { setLoading(false); },
        });
        handler.openIframe();
        return;
      }

      // Fallback: redirect via edge function
      const { data, error } = await supabase.functions.invoke('paystack-init', {
        body: { plan: selectedPlan, amount: selected.price, callbackUrl, email: session.user.email },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) {
        let msg = error.message;
        if (error instanceof FunctionsHttpError) {
          try { msg = await error.context.text(); } catch { /* ignore */ }
        }
        toast.error(`Payment error: ${msg}`);
        return;
      }
      if (data?.authorization_url) window.location.href = data.authorization_url;
    } catch (err) {
      console.error('Paystack init error:', err);
      toast.error('Failed to initialize payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load Paystack inline script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    document.head.appendChild(script);
    return () => { try { document.head.removeChild(script); } catch { /* ignore */ } };
  }, []);

  const handleAdUnlock = () => {
    if (!session) { navigate('/login'); return; }
    setShowAdOverlay(true);
  };

  const handleAdComplete = () => {
    setShowAdOverlay(false);
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    localStorage.setItem('playmax_ad_premium', expiry);
    toast.success('24-hour PlayMax+ unlocked! Enjoy ad-free streaming.');
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <Navbar />
      {showAdOverlay && <AdVideoOverlay onComplete={handleAdComplete} />}
      <main className="pt-16">
        <div className="relative py-20 px-4 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#e50914]/10 via-transparent to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#e50914]/10 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Crown size={28} className="text-[#f5c518]" />
              <span className="text-[#f5c518] font-black text-lg uppercase tracking-widest">PlayMax+</span>
            </div>
            {isPremium ? (
              <div className="bg-green-900/30 border border-green-700/40 rounded-2xl p-6 max-w-md mx-auto">
                <Check size={40} className="text-green-400 mx-auto mb-3" />
                <h1 className="text-white text-3xl font-black mb-2">You&apos;re Premium!</h1>
                <p className="text-green-400/80 text-sm">Enjoy unlimited ad-free streaming</p>
              </div>
            ) : (
              <>
                <h1 className="text-white text-4xl sm:text-5xl lg:text-6xl font-black mb-4">
                  Unlimited Streaming<br />
                  <span className="text-[#e50914]">Zero Compromises</span>
                </h1>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                  Get access to everything PlayMax TV has to offer — ad-free, in stunning quality, on any device.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-12">
          {/* Plans */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {SUBSCRIPTION_PLANS.map(plan => (
              <div key={plan.id} onClick={() => setSelectedPlan(plan.id)}
                className={`relative cursor-pointer rounded-2xl p-6 border-2 transition-all duration-300 ${selectedPlan === plan.id ? 'border-[#e50914] bg-[#e50914]/10 scale-105' : 'border-gray-800 bg-[#1a1a1a] hover:border-gray-600'}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#e50914] to-red-700 text-white text-xs font-black px-4 py-1 rounded-full uppercase tracking-wider">
                    Most Popular
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-white font-black text-xl capitalize mb-1">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-gray-400 text-lg">₦</span>
                    <span className="text-white text-4xl font-black">{plan.price.toLocaleString()}</span>
                    <span className="text-gray-500 text-sm">/{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-2.5">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check size={15} className="text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Payment Section */}
          <div className="bg-[#141414] rounded-2xl p-6 border border-gray-800/40 mb-8">
            <h2 className="text-white font-black text-lg mb-2 flex items-center gap-2">
              <CreditCard size={18} className="text-[#e50914]" /> Pay for {selected?.name} — ₦{selected?.price.toLocaleString()}
            </h2>
            <p className="text-gray-500 text-sm mb-5">Choose your preferred payment method</p>

            <div className="grid sm:grid-cols-2 gap-4 mb-5">
              {/* Paystack */}
              <button onClick={handlePaystack} disabled={loading || isPremium}
                className="flex items-center gap-3 bg-[#00c3f7]/10 border border-[#00c3f7]/30 hover:border-[#00c3f7]/60 rounded-2xl p-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left group">
                <div className="w-12 h-12 rounded-xl bg-[#00c3f7]/20 flex items-center justify-center flex-shrink-0">
                  <svg width="28" height="28" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="50" height="50" rx="12" fill="#00c3f7"/>
                    <path d="M12 25h26M18 16l14 18M32 16L18 34" stroke="white" strokeWidth="4" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-white font-black text-sm">{loading ? 'Loading...' : 'Pay with Paystack'}</p>
                  <p className="text-gray-500 text-xs">Card, Bank Transfer, USSD, Mobile Money</p>
                </div>
              </button>

              {/* PayPal */}
              <a href={`https://www.paypal.com/paypalme/${PAYMENT_INFO.paypal.split('@')[0]}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 bg-[#003087]/10 border border-[#003087]/30 hover:border-[#003087]/60 rounded-2xl p-4 transition-all text-left">
                <div className="w-12 h-12 rounded-xl bg-[#003087]/20 flex items-center justify-center flex-shrink-0">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 19.5l1.05-5.75c.11-.6.65-1.05 1.26-1.05h5.26c3.07 0 5.03-1.5 5.51-4.18C21.5 5.6 19.2 4 16.5 4H9.9c-.62 0-1.15.45-1.26 1.06L5.5 18.5" fill="#003087"/>
                    <path d="M20.3 7.9c-.48 2.68-2.44 4.18-5.51 4.18H9.54l-1.05 5.75c-.11.6.29 1.16.9 1.16h3.67c.54 0 1-.4 1.08-.93l.55-3.04h1.76c3.07 0 5.03-1.5 5.51-4.18.36-1.99-.17-3.45-1.66-4.94z" fill="#009cde"/>
                  </svg>
                </div>
                <div>
                  <p className="text-white font-black text-sm">Pay with PayPal</p>
                  <p className="text-gray-500 text-xs">International · {PAYMENT_INFO.paypal}</p>
                </div>
              </a>
            </div>

            <div className="bg-gray-900/50 rounded-xl p-3 mb-5 border border-gray-800/40">
              <p className="text-gray-500 text-xs">
                <span className="text-gray-400 font-semibold">PayPal note:</span> After paying via PayPal, upload your proof at{' '}
                <Link to="/profile?tab=premium" className="text-[#e50914]">Profile → Upload Proof</Link>.
                Paystack activates instantly.
              </p>
            </div>

            <Link to="/profile?tab=premium"
              className="flex items-center justify-center gap-2 w-full border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 py-3 rounded-xl text-sm font-semibold transition-all">
              <Wallet size={16} /> Already paid via PayPal? Upload proof here
            </Link>
          </div>

          {/* Watch Ad unlock */}
          <div className="bg-gradient-to-r from-[#0d1a00] to-[#0d0d0d] border border-green-800/30 rounded-2xl p-5 mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-green-800/30 flex items-center justify-center flex-shrink-0">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="4" width="20" height="14" rx="3" stroke="#4ade80" strokeWidth="1.5"/>
                    <circle cx="12" cy="11" r="3" fill="#4ade80"/>
                    <path d="M10.5 10l3 1.5-3 1.5V10z" fill="#0d1a00"/>
                  </svg>
                </div>
                <div>
                  <p className="text-green-400 font-black text-sm">Watch Ad → 24hrs Free Premium</p>
                  <p className="text-gray-600 text-xs">Watch a 30s ad to unlock PlayMax+ for 24 hours free</p>
                </div>
              </div>
              <button onClick={handleAdUnlock}
                className="flex-shrink-0 bg-green-700 hover:bg-green-600 text-white font-black px-5 py-2.5 rounded-xl text-sm transition-colors">
                Watch Ad (Free)
              </button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mb-10">
            <h2 className="text-white text-2xl font-black text-center mb-8">Everything Included</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {PREMIUM_FEATURES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800/50">
                  <div className="w-10 h-10 rounded-lg bg-[#e50914]/20 flex items-center justify-center mb-3">
                    <Icon size={20} className="text-[#e50914]" />
                  </div>
                  <h3 className="text-white font-semibold text-sm">{title}</h3>
                  <p className="text-gray-500 text-xs mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Comparison */}
          <div className="mb-10 overflow-x-auto">
            <h2 className="text-white text-2xl font-black text-center mb-6">Free vs PlayMax+</h2>
            <table className="w-full min-w-[400px]">
              <thead>
                <tr className="border-b border-gray-800">
                  {COMPARISON[0].map((col, i) => (
                    <th key={i} className={`py-3 px-4 text-sm font-bold ${i === 0 ? 'text-left text-gray-400' : i === 1 ? 'text-center text-gray-400' : 'text-center text-[#f5c518]'}`}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.slice(1).map((row, rowIdx) => (
                  <tr key={rowIdx} className="border-b border-gray-800/50 hover:bg-gray-900/30 transition-colors">
                    <td className="py-3 px-4 text-gray-300 text-sm">{row[0]}</td>
                    <td className="py-3 px-4 text-center">
                      {row[1] === true ? <Check size={16} className="text-green-500 mx-auto" /> : row[1] === false ? <X size={16} className="text-gray-700 mx-auto" /> : <span className="text-gray-400 text-sm">{row[1]}</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row[2] === true ? <Check size={16} className="text-green-400 mx-auto" /> : row[2] === false ? <X size={16} className="text-gray-700 mx-auto" /> : <span className="text-[#f5c518] text-sm font-bold">{row[2]}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-center">
            <button onClick={handlePaystack} disabled={loading || isPremium}
              className="bg-gradient-to-r from-[#e50914] to-red-700 text-white font-black px-10 py-4 rounded-2xl text-lg hover:from-red-700 hover:to-red-900 transition-all shadow-lg shadow-red-900/30 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Processing...' : isPremium ? 'Already Premium' : `Pay ₦${selected?.price.toLocaleString()}/${selected?.period} with Paystack`}
            </button>
            <p className="text-gray-600 text-xs mt-3">Cancel anytime · No hidden fees · Powered by Paystack</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

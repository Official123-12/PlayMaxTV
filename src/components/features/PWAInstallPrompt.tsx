import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'playmax_pwa_dismissed';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Don't show if previously dismissed
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;

    // Already installed (standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show after 5 seconds
      setTimeout(() => setShow(true), 5000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('PWA install outcome:', outcome);
    setShow(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setShow(false);
  };

  if (!show || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-[360px] z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-[#161616] border border-gray-700/60 rounded-2xl p-4 shadow-2xl shadow-black/60">
        <div className="flex items-start gap-3">
          {/* App icon */}
          <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg">
            <img src="/icon-192.png" alt="PlayMax TV" className="w-full h-full object-cover" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white font-black text-sm">Install PlayMax TV</p>
                <p className="text-gray-500 text-xs mt-0.5">Add to your home screen for the best experience</p>
              </div>
              <button onClick={handleDismiss} className="text-gray-600 hover:text-gray-400 transition-colors p-1 ml-2 flex-shrink-0">
                <X size={16} />
              </button>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={handleInstall}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#e50914] text-white text-xs font-black py-2.5 rounded-xl hover:bg-red-700 transition-colors"
              >
                <Download size={13} /> Install App
              </button>
              <button onClick={handleDismiss} className="px-4 py-2.5 rounded-xl border border-gray-700 text-gray-500 text-xs hover:text-white hover:border-gray-500 transition-colors font-semibold">
                Later
              </button>
            </div>
          </div>
        </div>

        {/* Feature bullets */}
        <div className="mt-3 pt-3 border-t border-gray-800/60 grid grid-cols-3 gap-2 text-center">
          {[
            ['Offline', 'Watch downloaded'],
            ['Faster', 'App-like speed'],
            ['Home', 'Screen shortcut'],
          ].map(([label, desc]) => (
            <div key={label}>
              <p className="text-white text-xs font-bold">{label}</p>
              <p className="text-gray-600 text-[10px]">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { X, Smartphone, Share, PlusSquare, CheckCircle, Download } from 'lucide-react';

export const InstallModal: React.FC = () => {
  const { isInstallOpen, setInstallOpen } = usePlayer();
  const [activePlatform, setActivePlatform] = useState<'ios' | 'android'>('ios');

  if (!isInstallOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm bg-[#0e0e11] border border-white/10 rounded-2xl shadow-2xl p-5 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-white" />
            <h3 className="text-sm font-bold text-white">Install App to Phone</h3>
          </div>
          <button
            onClick={() => setInstallOpen(false)}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Platform switcher */}
        <div className="flex bg-[#070709] rounded-xl p-1 my-4 border border-zinc-800">
          <button
            onClick={() => setActivePlatform('ios')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activePlatform === 'ios'
                ? 'bg-white text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            iPhone (iOS)
          </button>
          <button
            onClick={() => setActivePlatform('android')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activePlatform === 'android'
                ? 'bg-white text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Android
          </button>
        </div>

        {/* Instructions */}
        {activePlatform === 'ios' ? (
          <div className="space-y-3 text-xs text-zinc-300">
            <div className="flex items-start space-x-3 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 text-white border border-zinc-700 flex items-center justify-center shrink-0">
                <Share className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-white">1. Tap Share in Safari</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Tap the <span className="text-white font-semibold">Share</span> icon at the bottom of Safari.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 text-white border border-zinc-700 flex items-center justify-center shrink-0">
                <PlusSquare className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-white">2. Add to Home Screen</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Scroll down the menu and tap <span className="text-white font-semibold">"Add to Home Screen"</span>.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 text-white border border-zinc-700 flex items-center justify-center shrink-0">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-white">3. Done!</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Tap <span className="text-white font-semibold">"Add"</span>. It installs onto your phone like a native app.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-xs text-zinc-300">
            <div className="flex items-start space-x-3 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 text-white border border-zinc-700 flex items-center justify-center shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-white">1. Tap Menu or Install</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  In Chrome, tap the 3 dots in the top right, or click the <span className="text-white font-semibold">Install</span> button in the top bar.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 text-white border border-zinc-700 flex items-center justify-center shrink-0">
                <PlusSquare className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-white">2. Confirm Install</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Tap <span className="text-white font-semibold">"Install app"</span>.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 text-white border border-zinc-700 flex items-center justify-center shrink-0">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-white">3. Ready to Play</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  The app is now in your app drawer and home screen.
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setInstallOpen(false)}
          className="w-full mt-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition-all border border-zinc-700"
        >
          Got it
        </button>
      </div>
    </div>
  );
};

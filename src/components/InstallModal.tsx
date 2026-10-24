import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { X, Smartphone, Share, PlusSquare, CheckCircle, Download } from 'lucide-react';

export const InstallModal: React.FC = () => {
  const { isInstallOpen, setInstallOpen } = usePlayer();
  const [activePlatform, setActivePlatform] = useState<'ios' | 'android'>('ios');

  if (!isInstallOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm bg-[#0e1320] border border-slate-800 rounded-2xl shadow-2xl p-5 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-violet-400" />
            <h3 className="text-sm font-bold text-white">Install App to Phone</h3>
          </div>
          <button
            onClick={() => setInstallOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Platform switcher */}
        <div className="flex bg-slate-900 rounded-lg p-1 my-4 border border-slate-800">
          <button
            onClick={() => setActivePlatform('ios')}
            className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activePlatform === 'ios'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            iPhone (iOS)
          </button>
          <button
            onClick={() => setActivePlatform('android')}
            className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activePlatform === 'android'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Android
          </button>
        </div>

        {/* Instructions */}
        {activePlatform === 'ios' ? (
          <div className="space-y-3 text-xs text-slate-300">
            <div className="flex items-start space-x-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="w-7 h-7 rounded-lg bg-violet-950/60 text-violet-400 border border-violet-500/30 flex items-center justify-center shrink-0">
                <Share className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-white">1. Tap Share in Safari</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tap the <span className="text-violet-300 font-medium">Share</span> button at the bottom of Safari.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="w-7 h-7 rounded-lg bg-violet-950/60 text-violet-400 border border-violet-500/30 flex items-center justify-center shrink-0">
                <PlusSquare className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-white">2. Add to Home Screen</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Scroll down the menu and tap <span className="text-violet-300 font-medium">"Add to Home Screen"</span>.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="w-7 h-7 rounded-lg bg-violet-950/60 text-violet-400 border border-violet-500/30 flex items-center justify-center shrink-0">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-white">3. Done!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tap <span className="text-violet-300 font-medium">"Add"</span>. The app icon will appear on your home screen with zero browser bars!
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-xs text-slate-300">
            <div className="flex items-start space-x-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="w-7 h-7 rounded-lg bg-violet-950/60 text-violet-400 border border-violet-500/30 flex items-center justify-center shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-white">1. Tap Menu or Install</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  In Chrome, tap the 3 dots in the top right, or click the <span className="text-violet-300 font-medium">Install App</span> button in the top bar.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="w-7 h-7 rounded-lg bg-violet-950/60 text-violet-400 border border-violet-500/30 flex items-center justify-center shrink-0">
                <PlusSquare className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-white">2. Tap "Install app"</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Confirm the installation prompt.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="w-7 h-7 rounded-lg bg-violet-950/60 text-violet-400 border border-violet-500/30 flex items-center justify-center shrink-0">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-white">3. Ready to Play</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  The app is now installed on your Android app drawer and home screen.
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setInstallOpen(false)}
          className="w-full mt-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-all"
        >
          Got it
        </button>
      </div>
    </div>
  );
};

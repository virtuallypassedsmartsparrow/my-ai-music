import React from 'react';
import { PlayerProvider } from './context/PlayerContext';
import { Header } from './components/Header';
import { SongList } from './components/SongList';
import { MiniPlayer } from './components/MiniPlayer';
import { FullPlayer } from './components/FullPlayer';
import { AdminModal } from './components/AdminModal';
import { InstallModal } from './components/InstallModal';

export const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col antialiased selection:bg-white selection:text-black">
      <Header />
      <main className="flex-1">
        <SongList />
      </main>
      <MiniPlayer />
      <FullPlayer />
      <AdminModal />
      <InstallModal />
    </div>
  );
};

export default function App() {
  return (
    <PlayerProvider>
      <AppContent />
    </PlayerProvider>
  );
}

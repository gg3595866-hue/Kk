import React from 'react';
import { getGamesByCategory } from '@/data/games';
import { GameCard } from '@/components/GameCard';
import { MonitorPlay, Radio } from 'lucide-react';

export function TVGames() {
  const tvGames = getGamesByCategory('tv');

  return (
    <div className="flex flex-col w-full h-full">
      {/* Featured Stream Placeholder */}
      <div className="w-full aspect-video bg-black relative flex flex-col items-center justify-center overflow-hidden border-b border-border">
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-destructive text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
          <Radio className="w-3 h-3 animate-pulse" /> Live Stream
        </div>
        <MonitorPlay className="w-12 h-12 text-muted-foreground/30 mb-2" />
        <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Select game to watch</span>
      </div>

      <div className="bg-secondary p-3 border-b border-border">
        <h1 className="text-lg font-black uppercase text-white font-display italic">TV Games Lobby</h1>
      </div>

      {/* Grid */}
      <div className="p-3">
        <div className="grid grid-cols-2 gap-3">
          {tvGames.map(game => (
            <GameCard key={game.slug} game={game} />
          ))}
        </div>
      </div>
    </div>
  );
}

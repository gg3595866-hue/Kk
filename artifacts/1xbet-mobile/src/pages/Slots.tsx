import React from 'react';
import { getGamesByCategory } from '@/data/games';
import { GameCard } from '@/components/GameCard';

export function Slots() {
  const slotsGames = getGamesByCategory('slots');

  return (
    <div className="flex flex-col w-full h-full">
      {/* Header */}
      <div className="bg-[url('https://images.unsplash.com/photo-1596838132731-3301c3fd4317?q=80&w=600&auto=format&fit=crop')] bg-cover bg-center h-32 relative">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <h1 className="text-3xl font-black italic uppercase text-white font-display tracking-wider">
            Slo<span className="text-primary">ts</span>
          </h1>
          <p className="text-xs font-medium text-gray-300 uppercase tracking-widest mt-1">Spin to win</p>
        </div>
      </div>

      <div className="bg-secondary px-4 py-2 border-b border-border flex justify-between items-center text-xs font-bold text-muted-foreground uppercase">
        <span>{slotsGames.length} Games Available</span>
      </div>

      {/* Grid */}
      <div className="p-3">
        <div className="grid grid-cols-3 gap-2">
          {slotsGames.map(game => (
            <GameCard key={game.slug} game={game} />
          ))}
        </div>
      </div>
    </div>
  );
}

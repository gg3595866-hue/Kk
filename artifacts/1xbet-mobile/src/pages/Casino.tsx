import React, { useState } from 'react';
import { GAMES, GameCategory } from '@/data/games';
import { GameCard } from '@/components/GameCard';
import { Diamond } from 'lucide-react';

export function Casino() {
  const [activeTab, setActiveTab] = useState<'all' | 'cards' | 'roulette' | 'table'>('all');

  const allowedCategories = ['cards', 'roulette', 'table'];
  
  const displayedGames = GAMES.filter(g => 
    allowedCategories.includes(g.category) && 
    (activeTab === 'all' || g.category === activeTab)
  );

  return (
    <div className="flex flex-col w-full h-full">
      {/* Featured Promo */}
      <div className="w-full bg-gradient-to-br from-purple-900 to-indigo-950 p-6 flex flex-col items-center justify-center relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-50 mix-blend-overlay"></div>
        <Diamond className="w-12 h-12 text-yellow-400 mb-2 z-10" />
        <h2 className="text-2xl font-black uppercase text-white font-display italic z-10 text-center leading-tight">
          Live Casino<br/><span className="text-primary text-xl">Lobby</span>
        </h2>
        <button className="mt-3 z-10 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold px-6 py-2 rounded uppercase tracking-wider">
          Play Live
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-border bg-card">
        <div className="flex">
          {[
            { id: 'all', label: 'Lobby' },
            { id: 'cards', label: 'Cards' },
            { id: 'roulette', label: 'Roulette' },
            { id: 'table', label: 'Table' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors relative
                ${activeTab === tab.id ? 'text-primary' : 'text-muted-foreground hover:text-white'}`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="p-3">
        <div className="grid grid-cols-3 gap-2">
          {displayedGames.map(game => (
            <GameCard key={game.slug} game={game} />
          ))}
        </div>
      </div>
    </div>
  );
}

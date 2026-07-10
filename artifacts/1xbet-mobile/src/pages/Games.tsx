import React, { useState } from 'react';
import { CATEGORIES, getGamesByCategory, GameCategory } from '@/data/games';
import { GameCard } from '@/components/GameCard';
import { Search, Gamepad2, Plane, Zap, Diamond, CircleDot, LayoutGrid, MonitorPlay, Play } from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  all: <Gamepad2 className="w-4 h-4" />,
  crash: <Plane className="w-4 h-4" />,
  slots: <Zap className="w-4 h-4" />,
  instant: <Play className="w-4 h-4" />,
  cards: <Diamond className="w-4 h-4" />,
  roulette: <CircleDot className="w-4 h-4" />,
  table: <LayoutGrid className="w-4 h-4" />,
  tv: <MonitorPlay className="w-4 h-4" />
};

export function Games() {
  const [activeTab, setActiveTab] = useState<GameCategory | 'all'>('all');
  const [search, setSearch] = useState('');

  const displayedGames = getGamesByCategory(activeTab).filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full h-full">
      {/* Page Header */}
      <div className="bg-secondary p-3 flex flex-col gap-3">
        <h1 className="text-lg font-black uppercase text-white italic font-display">1xGames</h1>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Find a game..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-background border border-border rounded-md py-2 pl-9 pr-3 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Horizontal Tabs */}
      <div className="border-b border-border bg-card">
        <div className="flex overflow-x-auto hide-scrollbar">
          {CATEGORIES.map(cat => {
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide transition-colors relative
                  ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-white'}`}
              >
                <span>{ICON_MAP[cat.id]}</span>
                {cat.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid */}
      <div className="p-3">
        {displayedGames.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No games found.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {displayedGames.map(game => (
              <GameCard key={game.slug} game={game} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

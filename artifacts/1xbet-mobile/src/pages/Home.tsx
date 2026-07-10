import React from 'react';
import { Link } from 'wouter';
import { HOT_GAMES, NEW_GAMES } from '@/data/games';
import { GameCard } from '@/components/GameCard';
import { Trophy, Gamepad2, Diamond, MonitorPlay, Zap } from 'lucide-react';

export function Home() {
  const sections = [
    { title: 'Live Sports', href: '/live', icon: Trophy, color: 'text-destructive', badge: 'LIVE' },
    { title: 'Pre-Match', href: '/line', icon: Trophy, color: 'text-primary' },
    { title: '1xGames', href: '/games', icon: Gamepad2, color: 'text-purple-400' },
    { title: 'Casino', href: '/casino', icon: Diamond, color: 'text-yellow-400' },
    { title: 'Slots', href: '/slots', icon: Zap, color: 'text-orange-400' },
    { title: 'TV Games', href: '/tvgames', icon: MonitorPlay, color: 'text-blue-400' },
  ];

  return (
    <div className="flex flex-col w-full pb-6">
      {/* Hero Promo Banner */}
      <div className="w-full relative bg-gradient-to-r from-blue-900 to-indigo-900 p-6 flex flex-col items-start justify-center overflow-hidden h-40">
        <div className="absolute top-0 right-0 opacity-20 pointer-events-none transform translate-x-4 -translate-y-4">
          <Diamond className="w-48 h-48" />
        </div>
        <div className="relative z-10">
          <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs font-bold rounded uppercase tracking-wider mb-2 inline-block">
            Welcome Bonus
          </span>
          <h2 className="text-2xl font-black italic text-white leading-tight uppercase font-display">
            100% up to <br/><span className="text-primary text-3xl">€100</span>
          </h2>
          <Link href="/register" className="mt-3 inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-1.5 px-4 rounded text-sm uppercase transition-colors cursor-pointer">
            Claim Now
          </Link>
        </div>
      </div>

      {/* Main Navigation Grid */}
      <div className="grid grid-cols-2 gap-2 p-3">
        {sections.map((sec) => {
          const Icon = sec.icon;
          return (
            <Link key={sec.title} href={sec.href}>
              <div className="bg-card border border-card-border p-3 rounded-lg flex items-center justify-between cursor-pointer active:scale-95 transition-transform">
                <div className="flex flex-col gap-1">
                  <Icon className={`w-6 h-6 ${sec.color}`} />
                  <span className="text-xs font-bold text-card-foreground">{sec.title}</span>
                </div>
                {sec.badge && (
                  <span className="bg-destructive/10 text-destructive text-[10px] font-bold px-1.5 py-0.5 rounded animate-pulse">
                    {sec.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Hot Games Horizontal Strip */}
      <div className="mt-2">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="text-sm font-bold uppercase text-white flex items-center gap-2">
            <span className="w-1 h-4 bg-primary inline-block rounded-full"></span>
            Hot Games
          </h2>
          <Link href="/games">
            <span className="text-xs text-primary font-bold uppercase cursor-pointer">All</span>
          </Link>
        </div>
        
        <div className="flex overflow-x-auto gap-3 px-4 pb-4 hide-scrollbar snap-x">
          {HOT_GAMES.slice(0, 8).map(game => (
            <div key={game.slug} className="min-w-[120px] max-w-[120px] snap-start shrink-0">
              <GameCard game={game} />
            </div>
          ))}
        </div>
      </div>

      {/* New Games Horizontal Strip */}
      <div className="mt-2">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="text-sm font-bold uppercase text-white flex items-center gap-2">
            <span className="w-1 h-4 bg-green-500 inline-block rounded-full"></span>
            New Games
          </h2>
          <Link href="/games">
            <span className="text-xs text-primary font-bold uppercase cursor-pointer">All</span>
          </Link>
        </div>
        
        <div className="flex overflow-x-auto gap-3 px-4 pb-4 hide-scrollbar snap-x">
          {NEW_GAMES.slice(0, 8).map(game => (
            <div key={game.slug} className="min-w-[120px] max-w-[120px] snap-start shrink-0">
              <GameCard game={game} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Trophy, Clock, PlayCircle } from 'lucide-react';

const LIVE_EVENTS = [
  {
    id: 1,
    sport: 'Football',
    league: 'UEFA Champions League',
    team1: 'Real Madrid',
    team2: 'Manchester City',
    score1: 2,
    score2: 1,
    time: '65:12',
    odds: { 1: 1.45, X: 3.20, 2: 4.50 }
  },
  {
    id: 2,
    sport: 'Football',
    league: 'Premier League',
    team1: 'Arsenal',
    team2: 'Chelsea',
    score1: 0,
    score2: 0,
    time: '23:45',
    odds: { 1: 2.10, X: 2.85, 2: 3.10 }
  },
  {
    id: 3,
    sport: 'Basketball',
    league: 'NBA',
    team1: 'Lakers',
    team2: 'Warriors',
    score1: 102,
    score2: 98,
    time: 'Q4 02:15',
    odds: { 1: 1.25, 2: 3.80 }
  },
  {
    id: 4,
    sport: 'Tennis',
    league: 'ATP Miami',
    team1: 'Alcaraz C.',
    team2: 'Sinner J.',
    score1: 1,
    score2: 1,
    time: 'Set 3 (4-3)',
    odds: { 1: 1.85, 2: 1.95 }
  }
];

export function Live() {
  return (
    <div className="flex flex-col w-full h-full pb-6 bg-background">
      <div className="bg-secondary p-3 flex items-center gap-2 border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
        <h1 className="text-lg font-black uppercase text-white font-display">Live Events</h1>
      </div>

      <div className="flex flex-col gap-2 p-2">
        {LIVE_EVENTS.map(event => (
          <div key={event.id} className="bg-card border border-card-border rounded-lg overflow-hidden flex flex-col">
            <div className="bg-secondary/50 px-3 py-1.5 flex justify-between items-center border-b border-border text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              <span className="flex items-center gap-1 text-white">
                <Trophy className="w-3 h-3 text-primary" /> {event.sport} • {event.league}
              </span>
              <span className="flex items-center gap-1 text-destructive font-bold bg-destructive/10 px-1.5 py-0.5 rounded">
                <Clock className="w-3 h-3" /> {event.time}
              </span>
            </div>
            
            <div className="p-3">
              <div className="flex justify-between items-center font-bold text-sm mb-2">
                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="flex justify-between items-center pr-4">
                    <span className="text-white truncate">{event.team1}</span>
                    <span className="text-primary text-base">{event.score1}</span>
                  </div>
                  <div className="flex justify-between items-center pr-4">
                    <span className="text-white truncate">{event.team2}</span>
                    <span className="text-primary text-base">{event.score2}</span>
                  </div>
                </div>
                
                <div className="flex flex-col items-center justify-center px-3 border-l border-border h-full">
                  <PlayCircle className="w-6 h-6 text-muted-foreground hover:text-white cursor-pointer" />
                </div>
              </div>

              {/* Odds */}
              <div className="grid grid-cols-3 gap-1 mt-3">
                <button className="bg-background hover:bg-secondary border border-border rounded py-1.5 flex flex-col items-center justify-center transition-colors">
                  <span className="text-[10px] text-muted-foreground">W1</span>
                  <span className="text-xs font-bold text-white">{event.odds[1]}</span>
                </button>
                {event.odds.X ? (
                  <button className="bg-background hover:bg-secondary border border-border rounded py-1.5 flex flex-col items-center justify-center transition-colors">
                    <span className="text-[10px] text-muted-foreground">X</span>
                    <span className="text-xs font-bold text-white">{event.odds.X}</span>
                  </button>
                ) : <div />}
                <button className="bg-background hover:bg-secondary border border-border rounded py-1.5 flex flex-col items-center justify-center transition-colors">
                  <span className="text-[10px] text-muted-foreground">W2</span>
                  <span className="text-xs font-bold text-white">{event.odds[2]}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

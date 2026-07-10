import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';

const SPORTS = [
  { id: 'football', name: 'Football', count: 1245 },
  { id: 'tennis', name: 'Tennis', count: 432 },
  { id: 'basketball', name: 'Basketball', count: 321 },
  { id: 'ice-hockey', name: 'Ice Hockey', count: 210 },
  { id: 'volleyball', name: 'Volleyball', count: 156 },
  { id: 'table-tennis', name: 'Table Tennis', count: 98 },
  { id: 'esports', name: 'eSports', count: 435 },
  { id: 'handball', name: 'Handball', count: 45 },
  { id: 'cricket', name: 'Cricket', count: 87 },
  { id: 'rugby', name: 'Rugby', count: 34 }
];

export function Line() {
  const [filter, setFilter] = useState<'all' | 'top'>('top');

  return (
    <div className="flex flex-col w-full h-full bg-background">
      <div className="bg-secondary p-3 flex flex-col gap-3 sticky top-0 z-10 border-b border-border">
        <h1 className="text-lg font-black uppercase text-white font-display italic">Pre-Match</h1>
        
        <div className="flex bg-background rounded-md p-1">
          <button 
            className={`flex-1 py-1.5 text-xs font-bold uppercase rounded ${filter === 'top' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            onClick={() => setFilter('top')}
          >
            Top Sports
          </button>
          <button 
            className={`flex-1 py-1.5 text-xs font-bold uppercase rounded ${filter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            onClick={() => setFilter('all')}
          >
            All Sports
          </button>
        </div>
      </div>

      <div className="flex flex-col divide-y divide-border">
        {SPORTS.slice(0, filter === 'top' ? 6 : SPORTS.length).map(sport => (
          <button 
            key={sport.id} 
            className="flex items-center justify-between p-4 bg-card hover:bg-secondary transition-colors text-left"
          >
            <span className="text-sm font-bold text-white uppercase">{sport.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{sport.count}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

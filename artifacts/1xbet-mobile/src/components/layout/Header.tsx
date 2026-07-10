import React from 'react';
import { Bell, Menu } from 'lucide-react';
import { Link } from 'wouter';

export function Header() {
  return (
    <header className="sticky top-0 z-50 flex h-14 w-full items-center justify-between bg-background px-4 border-b border-border shadow-sm">
      <div className="flex items-center gap-3">
        <button className="text-foreground p-1 hover:bg-secondary rounded-md transition-colors">
          <Menu className="h-6 w-6" />
        </button>
        <Link href="/" className="flex items-center cursor-pointer">
          <span className="text-xl font-black italic tracking-tighter text-white font-display">
            1x<span className="text-primary">BET</span>
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Bell className="w-5 h-5 text-white" />
        <div className="flex items-center gap-2">
          <Link href="/login" className="text-xs font-bold text-white px-2 py-1.5 cursor-pointer">
            LOG IN
          </Link>
          <Link href="/register" className="text-xs font-bold bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-[4px] uppercase tracking-wider transition-colors shadow-sm cursor-pointer">
            REGISTRATION
          </Link>
        </div>
      </div>
    </header>
  );
}

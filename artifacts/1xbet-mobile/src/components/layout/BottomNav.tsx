import React from 'react';
import { Link, useLocation } from 'wouter';
import { Home, Trophy, Gamepad2, Diamond, Menu } from 'lucide-react';

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/line', label: 'Sports', icon: Trophy },
    { href: '/games', label: '1xGames', icon: Gamepad2 },
    { href: '/casino', label: 'Casino', icon: Diamond },
    { href: '/menu', label: 'Menu', icon: Menu }, // Just visual for now
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-card border-t border-border pb-safe flex px-1 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
      {navItems.map((item) => {
        const isActive = location === item.href;
        const Icon = item.icon;
        
        // For menu, just make it a static button to match real app
        if (item.href === '/menu') {
          return (
            <button key={item.label} className="flex-1 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground">
              <Icon className="h-6 w-6" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          )
        }

        return (
          <Link key={item.label} href={item.href} className="flex-1">
            <div className={`flex h-full flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

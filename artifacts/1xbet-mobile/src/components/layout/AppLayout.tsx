import React from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-[100dvh] w-full max-w-md mx-auto bg-background text-foreground flex flex-col relative pb-16">
      <Header />
      <main className="flex-1 w-full overflow-x-hidden">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

import React from 'react';
import { Link, useLocation } from 'wouter';
import { Mail, Lock, Smartphone } from 'lucide-react';

export function Login() {
  const [, setLocation] = useLocation();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login - just redirect home
    setLocation('/');
  };

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-56px)] bg-background items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card border border-card-border rounded-xl shadow-2xl p-6 flex flex-col gap-6">
        
        <div className="text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-3">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-black italic text-white uppercase font-display">Log In</h1>
          <p className="text-xs text-muted-foreground mt-1">Access your account to start betting</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="space-y-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <input 
                type="text" 
                placeholder="Email or ID" 
                className="w-full pl-10 pr-3 py-3 bg-background border border-border rounded-md text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                required
              />
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
              <input 
                type="password" 
                placeholder="Password" 
                className="w-full pl-10 pr-3 py-3 bg-background border border-border rounded-md text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-background" />
              <span className="text-xs text-muted-foreground">Remember me</span>
            </label>
            <a href="#" className="text-xs font-bold text-primary hover:underline">Forgot Password?</a>
          </div>

          <button 
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm uppercase tracking-widest py-3 rounded-md transition-colors mt-2"
          >
            Log In
          </button>
        </form>

        <div className="flex items-center justify-center gap-2 text-xs">
          <span className="text-muted-foreground">Don't have an account?</span>
          <Link href="/register">
            <span className="font-bold text-green-500 hover:underline cursor-pointer uppercase">Register Now</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Smartphone, Mail, User, Gift } from 'lucide-react';

export function Register() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<'one-click' | 'phone' | 'email'>('one-click');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setLocation('/');
  };

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-56px)] bg-background p-4 pb-20">
      <div className="text-center mb-6 mt-4">
        <h1 className="text-2xl font-black italic text-white uppercase font-display">Registration</h1>
        <p className="text-xs text-muted-foreground mt-1">Join the ultimate betting experience</p>
      </div>

      <div className="w-full bg-card border border-card-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Tabs */}
        <div className="flex bg-secondary/50 border-b border-border">
          <button 
            onClick={() => setTab('one-click')}
            className={`flex-1 py-3 text-xs font-bold uppercase transition-colors text-center ${tab === 'one-click' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-white'}`}
          >
            One-Click
          </button>
          <button 
            onClick={() => setTab('phone')}
            className={`flex-1 py-3 text-xs font-bold uppercase transition-colors text-center border-l border-border ${tab === 'phone' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-white'}`}
          >
            By Phone
          </button>
          <button 
            onClick={() => setTab('email')}
            className={`flex-1 py-3 text-xs font-bold uppercase transition-colors text-center border-l border-border ${tab === 'email' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-white'}`}
          >
            Full
          </button>
        </div>

        <div className="p-5">
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            
            {tab !== 'one-click' && tab !== 'phone' && (
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input type="text" placeholder="First Name" className="w-full pl-10 pr-3 py-3 bg-background border border-border rounded-md text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary" required />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input type="text" placeholder="Last Name" className="w-full pl-10 pr-3 py-3 bg-background border border-border rounded-md text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary" required />
                </div>
              </div>
            )}

            {(tab === 'phone' || tab === 'email') && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                </div>
                <input type="tel" placeholder="Phone Number" className="w-full pl-10 pr-3 py-3 bg-background border border-border rounded-md text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary" required />
              </div>
            )}

            {tab === 'email' && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <input type="email" placeholder="Email Address" className="w-full pl-10 pr-3 py-3 bg-background border border-border rounded-md text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary" required />
              </div>
            )}

            <div className="relative">
              <select className="w-full pl-3 pr-8 py-3 bg-background border border-border rounded-md text-sm text-white appearance-none focus:outline-none focus:border-primary">
                <option value="EUR">EUR - Euro</option>
                <option value="USD">USD - US Dollar</option>
                <option value="GBP">GBP - British Pound</option>
              </select>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Gift className="h-4 w-4 text-primary" />
              </div>
              <input type="text" placeholder="Promo code (if you have one)" className="w-full pl-10 pr-3 py-3 bg-background border border-border rounded-md text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
            </div>

            <div className="bg-secondary/50 p-3 rounded-md border border-border mt-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-background" required />
                <span className="text-[10px] text-muted-foreground leading-tight">
                  I confirm that I am over 18 years old and I have read and agree to the Terms and Conditions and Privacy Policy of the company.
                </span>
              </label>
            </div>

            <button 
              type="submit"
              className="w-full bg-green-500 hover:bg-green-600 text-white font-black text-sm uppercase tracking-widest py-3 rounded-md transition-colors mt-2"
            >
              Register
            </button>
          </form>
        </div>
      </div>

      <div className="mt-6 text-center text-xs">
        <span className="text-muted-foreground">Already have an account?</span>
        <Link href="/login">
          <span className="font-bold text-primary hover:underline cursor-pointer uppercase ml-2">Log In</span>
        </Link>
      </div>
    </div>
  );
}

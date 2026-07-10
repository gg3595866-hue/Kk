import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, ExternalLink, Loader2, WifiOff } from 'lucide-react';
import { GAMES, CATEGORY_GRADIENTS } from '@/data/games';

interface GamePlayProps {
  params: { slug: string };
}

type ProxyStatus = 'loading' | 'ready' | 'error';

export function GamePlay({ params }: GamePlayProps) {
  const [, setLocation] = useLocation();
  const { slug } = params;
  const game = GAMES.find((g) => g.slug === slug);
  const gradient = game ? CATEGORY_GRADIENTS[game.category] : 'from-gray-700 to-gray-900';

  // Proxy URL — the API server is mounted at /api on the same domain
  const proxyUrl = `/api/proxy/en/games/${slug}`;
  const externalUrl = `https://1x-bet.mobi/en/games/${slug}`;

  const [proxyStatus, setProxyStatus] = useState<ProxyStatus>('loading');
  const [retryCount, setRetryCount] = useState(0);

  // Poll until Tor is ready (returns non-503)
  useEffect(() => {
    let cancelled = false;

    async function checkProxy() {
      try {
        const res = await fetch(`/api/proxy/en/games/${slug}`, { method: 'HEAD' });
        if (cancelled) return;
        if (res.status === 503) {
          // Tor not yet bootstrapped — retry in 3 s
          setTimeout(() => {
            if (!cancelled) setRetryCount((n) => n + 1);
          }, 3000);
        } else {
          setProxyStatus('ready');
        }
      } catch {
        if (!cancelled) setProxyStatus('error');
      }
    }

    checkProxy();
    return () => { cancelled = true; };
  }, [slug, retryCount]);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2 bg-secondary border-b border-border shrink-0">
        <button
          onClick={() => setLocation(-1 as unknown as string)}
          className="p-2 rounded-md hover:bg-muted transition-colors active:scale-95"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold uppercase italic text-white truncate font-display">
            {game?.name ?? slug}
          </h1>
          {proxyStatus === 'loading' && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Connecting via Tor…
            </p>
          )}
          {proxyStatus === 'ready' && (
            <p className="text-[10px] text-green-400">● Tor connected</p>
          )}
          {proxyStatus === 'error' && (
            <p className="text-[10px] text-destructive flex items-center gap-1">
              <WifiOff className="w-3 h-3" /> Proxy unavailable
            </p>
          )}
        </div>

        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-md hover:bg-muted transition-colors active:scale-95"
          title="Open in new tab"
        >
          <ExternalLink className="w-5 h-5 text-muted-foreground" />
        </a>
      </div>

      {/* Game area */}
      <div className="relative flex-1 overflow-hidden">
        {proxyStatus === 'loading' && (
          <div className={`absolute inset-0 z-10 bg-gradient-to-br ${gradient} flex flex-col items-center justify-center gap-4`}>
            <Loader2 className="w-10 h-10 text-white/70 animate-spin" />
            <div className="text-center">
              <p className="text-white/60 text-xs mb-1">Routing through Tor…</p>
              <p className="text-white font-bold uppercase text-lg italic">{game?.name ?? slug}</p>
            </div>
          </div>
        )}

        {proxyStatus === 'error' && (
          <div className={`absolute inset-0 z-10 bg-gradient-to-br ${gradient} flex flex-col items-center justify-center gap-6 px-6`}>
            <WifiOff className="w-10 h-10 text-white/60" />
            <div className="text-center">
              <p className="text-white font-bold uppercase text-lg italic mb-2">{game?.name ?? slug}</p>
              <p className="text-white/60 text-sm mb-4">Tor proxy unavailable.</p>
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold px-6 py-3 rounded-lg uppercase text-sm tracking-wide"
              >
                <ExternalLink className="w-4 h-4" />
                Open Direct
              </a>
            </div>
          </div>
        )}

        {/* Always mount the iframe; only show it once proxy is ready */}
        <iframe
          key={proxyUrl}
          src={proxyStatus === 'ready' ? proxyUrl : 'about:blank'}
          title={game?.name ?? slug}
          className="w-full h-full border-none"
          allow="fullscreen; payment"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
        />
      </div>
    </div>
  );
}

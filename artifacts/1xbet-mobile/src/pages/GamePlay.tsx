import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, ExternalLink, Puzzle } from 'lucide-react';
import { GAMES, CATEGORY_GRADIENTS } from '@/data/games';

interface GamePlayProps {
  params: { slug: string };
}

declare global {
  interface Window { __1XBET_EXT__?: boolean; }
}

export function GamePlay({ params }: GamePlayProps) {
  const [, setLocation] = useLocation();
  const { slug } = params;
  const game = GAMES.find((g) => g.slug === slug);
  const gradient = game ? CATEGORY_GRADIENTS[game.category] : 'from-gray-700 to-gray-900';

  // Detect the Kiwi extension — it sets window.__1XBET_EXT__ at document_start
  const [extReady, setExtReady] = useState<boolean>(
    typeof window !== 'undefined' && !!window.__1XBET_EXT__,
  );

  useEffect(() => {
    if (window.__1XBET_EXT__) { setExtReady(true); return; }
    // Listen for the custom event the content script fires
    const handler = () => setExtReady(true);
    document.addEventListener('1xbet-ext-ready', handler);
    // Fallback: poll once after 500 ms (content scripts can be slightly late)
    const t = setTimeout(() => {
      if (window.__1XBET_EXT__) setExtReady(true);
    }, 500);
    return () => { document.removeEventListener('1xbet-ext-ready', handler); clearTimeout(t); };
  }, []);

  // Always load directly from 1x-bet.mobi — the extension strips X-Frame-Options
  // so the iframe embeds fine. If a proxy is configured in the extension it is
  // applied at the network level (chrome.proxy PAC script) automatically.
  const externalUrl = `https://1x-bet.mobi/en/games/${slug}`;
  const iframeSrc = externalUrl;

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
          {extReady ? (
            <p className="text-[10px] text-green-400 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" />
              Extension active
            </p>
          ) : (
            <p className="text-[10px] text-yellow-400 flex items-center gap-1">
              <Puzzle className="w-3 h-3" /> Install extension for best experience
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
        {!extReady && (
          /* Shown behind the iframe — visible only if the iframe stays blank */
          <div className={`absolute inset-0 -z-10 bg-gradient-to-br ${gradient} flex flex-col items-center justify-center gap-5 px-6 text-center`}>
            <Puzzle className="w-12 h-12 text-white/50" />
            <div>
              <p className="text-white font-black uppercase italic text-xl mb-1">{game?.name ?? slug}</p>
              <p className="text-white/60 text-sm mb-4">
                Install the <strong className="text-white">1xBet Game Proxy</strong> extension in Kiwi Browser to play games directly.
              </p>
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold px-5 py-2.5 rounded-lg uppercase text-sm"
              >
                <ExternalLink className="w-4 h-4" /> Open Direct
              </a>
            </div>
          </div>
        )}

        <iframe
          src={iframeSrc}
          title={game?.name ?? slug}
          className="w-full h-full border-none"
          allow="fullscreen; payment; autoplay"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
        />
      </div>
    </div>
  );
}

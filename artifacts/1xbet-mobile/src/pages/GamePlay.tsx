import { useLocation } from 'wouter';
import { ArrowLeft, ExternalLink, Maximize2 } from 'lucide-react';
import { GAMES, CATEGORY_GRADIENTS } from '@/data/games';

interface GamePlayProps {
  params: { slug: string };
}

export function GamePlay({ params }: GamePlayProps) {
  const [, setLocation] = useLocation();
  const { slug } = params;
  const game = GAMES.find((g) => g.slug === slug);
  const gradient = game ? CATEGORY_GRADIENTS[game.category] : 'from-gray-700 to-gray-900';
  const gameUrl = `https://1x-bet.mobi/en/games/${slug}`;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2 bg-secondary border-b border-border shrink-0">
        <button
          data-testid="button-back"
          onClick={() => setLocation(-1 as unknown as string)}
          className="p-2 rounded-md hover:bg-muted transition-colors active:scale-95"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold uppercase italic text-white truncate font-display">
            {game?.name ?? slug}
          </h1>
          {game?.hot && (
            <span className="text-[10px] font-bold text-primary uppercase">Hot</span>
          )}
        </div>

        <a
          href={gameUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="link-open-external"
          className="p-2 rounded-md hover:bg-muted transition-colors active:scale-95"
        >
          <ExternalLink className="w-5 h-5 text-muted-foreground" />
        </a>
      </div>

      {/* iframe Game Area */}
      <div className="relative flex-1 overflow-hidden">
        <iframe
          src={gameUrl}
          title={game?.name ?? slug}
          className="w-full h-full border-none"
          allow="fullscreen; payment"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        />

        {/* Overlay shown if iframe is blocked — positioned underneath so the iframe takes precedence */}
        <div className={`absolute inset-0 -z-10 flex flex-col items-center justify-center gap-6 bg-gradient-to-br ${gradient}`}>
          <div className="text-center px-6">
            <p className="text-white/70 text-sm mb-2">Loading game…</p>
            <h2 className="text-2xl font-black italic text-white uppercase">{game?.name ?? slug}</h2>
          </div>
          <a
            href={gameUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-primary text-primary-foreground font-bold px-6 py-3 rounded-lg uppercase text-sm tracking-wide active:scale-95 transition-transform"
          >
            <Maximize2 className="w-4 h-4" />
            Open Full Screen
          </a>
        </div>
      </div>
    </div>
  );
}

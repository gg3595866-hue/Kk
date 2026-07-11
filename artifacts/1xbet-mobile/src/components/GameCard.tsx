import { useState } from 'react';
import { Link } from 'wouter';
import { Game, getGameImageUrl, CATEGORY_GRADIENTS } from '@/data/games';

interface GameCardProps {
  game: Game;
}

export function GameCard({ game }: GameCardProps) {
  const [imgError, setImgError] = useState(false);
  const gradient = CATEGORY_GRADIENTS[game.category];

  return (
    <Link href={`/game/${game.slug}`}>
      <div className="group relative flex flex-col overflow-hidden rounded-md bg-card border border-card-border shadow-sm active:scale-95 transition-transform duration-100 cursor-pointer">
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          {/* Try the real CDN thumbnail — loads fine from the user's browser.
              The extension adds CORS headers so the image is always accessible. */}
          {!imgError ? (
            <img
              src={getGameImageUrl(game.slug)}
              alt={game.name}
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            /* Fallback: category-coloured gradient with game name */
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-end justify-start p-2`}>
              <span className="text-white text-[10px] font-bold leading-tight drop-shadow-md line-clamp-2">
                {game.name}
              </span>
            </div>
          )}

          {!imgError && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          )}

          {/* HOT / NEW badges */}
          <div className="absolute top-1 right-1 flex flex-col gap-1 z-10">
            {game.hot && (
              <span className="rounded-[2px] bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary-foreground shadow">
                Hot
              </span>
            )}
            {game.new && (
              <span className="rounded-[2px] bg-green-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow">
                New
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col p-2 text-center h-[40px] justify-center">
          <h3 className="line-clamp-2 text-[11px] font-semibold leading-tight text-card-foreground">
            {game.name}
          </h3>
        </div>
      </div>
    </Link>
  );
}

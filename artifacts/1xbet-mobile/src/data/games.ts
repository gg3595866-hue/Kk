export type GameCategory =
  | 'crash'
  | 'slots'
  | 'instant'
  | 'cards'
  | 'roulette'
  | 'table'
  | 'tv';

export interface Game {
  slug: string;
  name: string;
  category: GameCategory;
  hot?: boolean;
  new?: boolean;
}

export const GAMES: Game[] = [
  // Crash / Aviator-style
  { slug: 'crash', name: 'Crash', category: 'crash', hot: true },
  { slug: 'crash-point', name: 'Crash Point', category: 'crash', hot: true },
  { slug: 'air-crash', name: 'Air Crash', category: 'crash' },
  { slug: 'zombie-crash', name: 'Zombie Crash', category: 'crash' },
  { slug: 'world-flight-26', name: 'World Flight 26', category: 'crash', new: true },
  { slug: 'kamikaze', name: 'Kamikaze', category: 'crash' },
  { slug: '1xvibe', name: '1xVibe', category: 'crash', hot: true },

  // Slots
  { slug: 'burning-hot', name: 'Burning Hot', category: 'slots', hot: true },
  { slug: 'western-slot', name: 'Western Slot', category: 'slots' },
  { slug: 'vampire-curse', name: 'Vampire Curse', category: 'slots' },
  { slug: 'respin-slot', name: 'Respin Slot', category: 'slots' },
  { slug: 'wild-west-gold', name: 'Wild West Gold', category: 'slots' },
  { slug: 'gems-bonanza', name: 'Gems Bonanza', category: 'slots', hot: true },
  { slug: 'resident', name: 'Resident', category: 'slots' },
  { slug: 'sugar-cascade', name: 'Sugar Cascade', category: 'slots' },
  { slug: 'pharaohs-kingdom', name: "Pharaoh's Kingdom", category: 'slots' },
  { slug: 'olympus-slot', name: 'Olympus Slot', category: 'slots', hot: true },
  { slug: 'dragons-gold', name: "Dragon's Gold", category: 'slots' },
  { slug: 'vikings', name: 'Vikings', category: 'slots' },
  { slug: 'pandoras-slots', name: "Pandora's Slots", category: 'slots' },
  { slug: 'book-of-ra', name: 'Book of Ra', category: 'slots', hot: true },
  { slug: 'lucky-slot', name: 'Lucky Slot', category: 'slots' },
  { slug: 'diamond-slots', name: 'Diamond Slots', category: 'slots' },
  { slug: 'fruit-blast', name: 'Fruit Blast', category: 'slots' },
  { slug: 'jackpot-wheel', name: 'Jackpot Wheel', category: 'slots' },
  { slug: 'eastern-night', name: 'Eastern Nights', category: 'slots' },
  { slug: 'swirly-spin', name: 'Swirly Spin', category: 'slots' },
  { slug: 'swamp-land', name: 'Swamp Land', category: 'slots' },
  { slug: 'lucky-knight', name: 'Lucky Knight', category: 'slots' },
  { slug: 'reels-of-wealth', name: 'Reels of Wealth', category: 'slots' },
  { slug: 'wild-fruits', name: 'Wild Fruits', category: 'slots' },
  { slug: 'steampunk-kingdom', name: 'Steampunk Kingdom', category: 'slots' },
  { slug: 'reels-of-gods', name: 'Reels of Gods', category: 'slots' },
  { slug: 'witch-game-of-thrones', name: 'Witch: Game Of Thrones', category: 'slots' },
  { slug: 'midgard-zombies', name: 'Midgard Zombies', category: 'slots' },
  { slug: 'las-vegas', name: 'Las Vegas', category: 'slots', hot: true },
  { slug: 'mayan-tomb', name: 'Mayan Tomb', category: 'slots' },
  { slug: 'killer-clubs', name: 'Killer Clubs', category: 'slots' },
  { slug: 'gems-odyssey', name: 'Gems Odyssey', category: 'slots' },
  { slug: 'wild-heist-showdown', name: 'Wild Heist Showdown', category: 'slots' },
  { slug: 'wild-heist-ultimate', name: 'Wild Heist Ultimate', category: 'slots', new: true },
  { slug: 'cyber2077', name: 'Cyber2077', category: 'slots', new: true },
  { slug: 'fruit-cocktail', name: 'Fruit Cocktail', category: 'slots', hot: true },
  { slug: 'triple-seven', name: '777', category: 'slots' },
  { slug: 'royal-feast', name: 'Royal Feast', category: 'slots' },

  // Instant / Quick Win
  { slug: 'coinflip', name: 'Coinflip', category: 'instant', hot: true },
  { slug: 'limbo', name: 'Limbo', category: 'instant' },
  { slug: 'plinko', name: 'Plinko', category: 'instant', hot: true },
  { slug: 'dice', name: 'Dice', category: 'instant' },
  { slug: 'thimbles', name: 'Thimbles', category: 'instant' },
  { slug: 'heads-or-tails', name: 'Heads or Tails', category: 'instant', hot: true },
  { slug: 'higher-vs-lower', name: 'Higher vs Lower', category: 'instant' },
  { slug: 'fair-higher-vs-lower', name: 'Fair Higher vs Lower', category: 'instant' },
  { slug: 'fear-or-win', name: 'Fear Or Win', category: 'instant' },
  { slug: 'lucky-cases', name: 'Lucky Cases', category: 'instant', hot: true },
  { slug: 'oxo', name: 'OXO', category: 'instant' },
  { slug: 'bet-magnet', name: 'Bet Magnet', category: 'instant' },
  { slug: 'games-mania', name: 'Games Mania', category: 'instant' },
  { slug: 'spin-and-win', name: 'Spin and Win', category: 'instant', hot: true },
  { slug: 'hi-lo-triple-chance', name: 'Hi-Lo Triple Chance', category: 'instant' },
  { slug: 'jackpot-game', name: 'Jackpot Game', category: 'instant' },
  { slug: 'star-lotto', name: 'Star Lotto', category: 'instant' },
  { slug: 'scratch-card', name: 'Scratch Card', category: 'instant' },
  { slug: 'money-wheel', name: 'Money Wheel', category: 'instant', hot: true },
  { slug: 'apple-of-fortune', name: 'Apple Of Fortune', category: 'instant', hot: true },
  { slug: 'mafias-riches', name: "Mafia's Riches", category: 'instant' },
  { slug: 'gems-and-mines', name: 'Gems & Mines', category: 'instant', hot: true },

  // Cards & Poker
  { slug: 'indian-poker', name: 'Indian Poker', category: 'cards', hot: true },
  { slug: 'solitaire', name: 'Solitaire', category: 'cards' },
  { slug: 'twenty-one', name: '21', category: 'cards', hot: true },
  { slug: 'card-war', name: 'Card War', category: 'cards' },
  { slug: 'pf-pokerlight', name: 'PF Poker Light', category: 'cards' },
  { slug: 'lucky-card', name: 'Lucky Card', category: 'cards' },
  { slug: 'texas', name: 'Texas', category: 'cards', hot: true },
  { slug: 'guess-which-hand', name: 'Guess Which Hand', category: 'cards' },
  { slug: 'crystal', name: 'Crystal', category: 'cards' },
  { slug: 'royal-hi-lo', name: 'Royal Hi-Lo', category: 'cards' },
  { slug: 'card-odds', name: 'Card Odds', category: 'cards' },
  { slug: 'flip-card', name: 'Flip Card', category: 'cards' },
  { slug: 'under-and-over-seven', name: 'Under and Over 7', category: 'cards' },

  // Roulette
  { slug: 'roulette', name: 'Roulette', category: 'roulette', hot: true },
  { slug: 'african-roulette', name: 'African Roulette', category: 'roulette' },

  // Table
  { slug: 'dominoes', name: 'Dominoes', category: 'table' },
  { slug: 'yahtzee', name: 'Yahtzee', category: 'table' },
  { slug: 'x-keno', name: 'X-Keno', category: 'table' },
  { slug: 'derby-racing', name: 'Derby Racing', category: 'table', hot: true },
  { slug: 'mundial', name: 'Mundial', category: 'table' },

  // TV / Special
  { slug: 'sea-treasures', name: 'Sea Treasures', category: 'tv' },
  { slug: 'penalties', name: 'Penalties', category: 'tv' },
  { slug: 'treasure-tomb', name: 'Treasure Tomb', category: 'tv' },
  { slug: 'goal', name: 'Goal!', category: 'tv', hot: true },
  { slug: 'fishing', name: 'Fishing', category: 'tv' },
];

export const CATEGORIES: { id: GameCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '🎮' },
  { id: 'crash', label: 'Crash', icon: '✈️' },
  { id: 'slots', label: 'Slots', icon: '🎰' },
  { id: 'instant', label: 'Quick', icon: '⚡' },
  { id: 'cards', label: 'Cards', icon: '🃏' },
  { id: 'roulette', label: 'Roulette', icon: '🎡' },
  { id: 'table', label: 'Table', icon: '🎲' },
  { id: 'tv', label: 'TV Games', icon: '📺' },
];

export const HOT_GAMES = GAMES.filter((g) => g.hot);
export const NEW_GAMES = GAMES.filter((g) => g.new);

export function getGamesByCategory(category: GameCategory | 'all'): Game[] {
  if (category === 'all') return GAMES;
  return GAMES.filter((g) => g.category === category);
}

export function getGameImageUrl(slug: string): string {
  return `https://v3.traincdn.com/genfiles/cms/games/${slug}/front_picture_sm.webp`;
}

export const CATEGORY_GRADIENTS: Record<GameCategory, string> = {
  crash:    'from-red-700 via-orange-600 to-yellow-500',
  slots:    'from-purple-700 via-pink-600 to-fuchsia-500',
  instant:  'from-cyan-700 via-blue-600 to-indigo-500',
  cards:    'from-green-700 via-emerald-600 to-teal-500',
  roulette: 'from-rose-700 via-red-600 to-pink-500',
  table:    'from-amber-700 via-yellow-600 to-orange-500',
  tv:       'from-sky-700 via-blue-600 to-violet-500',
};

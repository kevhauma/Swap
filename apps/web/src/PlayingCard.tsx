import { motion } from 'motion/react';
import { useState } from 'react';
import { cardName, isFaceUp, isRed, type Card, type CardView } from '@swap/engine';

const SIZES = { sm: 'w-11', md: 'w-16 sm:w-20' };

function Face({ card }: { card: Card }) {
  return card.rank === 'JOKER' ? (
    <div
      className={`flex size-full flex-col items-center justify-center rounded-md bg-white text-xs font-bold tracking-widest ${isRed(card) ? 'text-red-600' : 'text-neutral-900'}`}
    >
      <span className="text-2xl">★</span>
      JOKER
    </div>
  ) : (
    <img src={`/cards/${card.suit}${card.rank}.svg`} alt="" className="size-full rounded-md bg-white" />
  );
}

/**
 * One physical card. `layoutId` = the card's opaque id, so Motion animates it to wherever the
 * next server view puts it (another hand, the discard pile) — swaps need no animation code.
 */
export function PlayingCard({
  card,
  revealed,
  onClick,
  size = 'md',
  selected = false,
}: {
  card: CardView;
  revealed?: Card;
  onClick?: () => void;
  size?: keyof typeof SIZES;
  selected?: boolean;
}) {
  const face = isFaceUp(card) ? card : revealed;
  // Keep the face mounted while flipping back, then drop it from the DOM.
  const [shown, setShown] = useState(face);
  if (face && face !== shown) setShown(face);

  return (
    <motion.button
      layoutId={card.id}
      type="button"
      disabled={!onClick}
      onClick={onClick}
      aria-label={face ? cardName(face) : 'Face-down card'}
      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      className={`relative aspect-[167/243] shrink-0 rounded-md perspective-midrange ${SIZES[size]} ${
        onClick ? 'ring-2 ring-turn/70 hover:ring-turn' : ''
      } ${selected ? '-translate-y-2 ring-4 ring-turn' : ''}`}
    >
      <motion.div
        className="absolute inset-0 transform-3d"
        initial={false}
        animate={{ rotateY: face ? 180 : 0 }}
        transition={{ duration: 0.45 }}
        onAnimationComplete={() => !face && setShown(undefined)}
      >
        <img src="/cards/back.svg" alt="" className="absolute inset-0 size-full backface-hidden" />
        <div className="absolute inset-0 rotate-y-180 backface-hidden">{shown && <Face card={shown} />}</div>
      </motion.div>
    </motion.button>
  );
}

/** Empty stack / discard slot, like the "Logo" placeholders in the mock. */
export function Slot({ label, size = 'md' }: { label: string; size?: keyof typeof SIZES }) {
  return (
    <div
      className={`flex aspect-[167/243] shrink-0 items-center justify-center rounded-md border-2 border-dashed border-slot/40 text-xs text-slot/70 ${SIZES[size]}`}
    >
      {label}
    </div>
  );
}

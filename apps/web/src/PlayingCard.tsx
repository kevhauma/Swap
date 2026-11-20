import { motion, useMotionValue } from 'motion/react';
import { useState } from 'react';
import { cardName, isFaceUp, isRed, type Card, type CardView } from '@swap/engine';

// sm stays 44 px wide on phones: the minimum tap target for spy and swaps.
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
  peeked = false,
}: {
  card: CardView;
  revealed?: Card;
  onClick?: () => void;
  size?: keyof typeof SIZES;
  selected?: boolean;
  /** Someone just looked at this card; everyone sees where, only the peeker sees the face. */
  peeked?: boolean;
}) {
  const face = isFaceUp(card) ? card : revealed;
  // Keep the face mounted while flipping back, then drop it from the DOM.
  const [shown, setShown] = useState(face);
  if (face && face !== shown) setShown(face);
  // Lift a card above the rest of the table while it travels, e.g. a given card passing the stack.
  const zIndex = useMotionValue(0);

  return (
    <motion.button
      layoutId={card.id}
      type="button"
      disabled={!onClick}
      onClick={onClick}
      aria-label={face ? cardName(face) : 'Face-down card'}
      // Unhurried, so you can follow where a card goes.
      transition={{ type: 'spring', duration: 0.9, bounce: 0.15 }}
      style={{ zIndex }}
      onLayoutAnimationStart={() => zIndex.set(1)}
      onLayoutAnimationComplete={() => zIndex.set(0)}
      className={`relative aspect-[167/243] shrink-0 rounded-md shadow-[0_2px_2px_rgb(10_30_15/0.35),0_7px_9px_-2px_rgb(10_30_15/0.3)] perspective-midrange ${SIZES[size]} ${
        onClick ? 'tappable' : ''
      } ${selected ? '-translate-y-2 outline-3 outline-offset-2 outline-chalk' : ''} ${peeked ? 'peeked' : ''}`}
    >
      <motion.div
        className="absolute inset-0 transform-3d"
        initial={false}
        animate={{ rotateY: face ? 180 : 0 }}
        transition={{ duration: 0.6 }}
        onAnimationComplete={() => !face && setShown(undefined)}
      >
        <div className="card-back absolute inset-0 size-full backface-hidden" />
        <div className="absolute inset-0 rotate-y-180 backface-hidden">{shown && <Face card={shown} />}</div>
      </motion.div>
    </motion.button>
  );
}

/** Empty stack / discard slot, like the "Logo" placeholders in the mock. */
export function Slot({ label, size = 'md' }: { label: string; size?: keyof typeof SIZES }) {
  return (
    <div
      className={`flex aspect-[167/243] shrink-0 items-center justify-center rounded-md border-2 border-dashed border-chalk/40 text-sm text-chalk/70 ${SIZES[size]}`}
    >
      {label}
    </div>
  );
}

import { useEffect, useState, type CSSProperties } from 'react';
import {
  powerOf,
  type Action,
  type Card,
  type CardView,
  type GameView,
  type PlayerView,
} from '@swap/engine';
import { PlayingCard, Slot } from './PlayingCard.tsx';
import { isMuted, setMuted } from './sounds.ts';

type Mode =
  | { kind: 'idle' }
  | { kind: 'takeOpen' }
  | { kind: 'match' }
  | { kind: 'matchGive'; target: string }
  | { kind: 'blindOwn'; own: string };

const POWER_LABEL = {
  peekOwn: 'look at one of your cards',
  spy: "look at an opponent's card",
  blindSwap: 'blind swap',
  openSwap: 'open swap',
  peekStack: 'look at the top 3 of the stack',
};

const button = 'wood';
const PEEK_HIGHLIGHT_MS = 2000;

/** Hand-drawn chalk loop around whoever's turn it is. */
const ChalkLoop = () => (
  <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden className="absolute -inset-x-2.5 -inset-y-2 size-[calc(100%+20px)] overflow-visible">
    <path
      d="M8 22C6 8 40 3 62 5s34 8 32 18-30 14-54 13S4 30 10 16c3-5 10-8 18-9"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
);

/** Poker-chip avatar with the player's initials; the hue steps by the golden angle per seat, so no two seats match. */
const Avatar = ({ name, seat }: { name: string; seat: number }) => (
  <span className="avatar" style={{ '--hue': (seat * 137.5) % 360 } as CSSProperties} aria-hidden>
    {name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase()}
  </span>
);

const LockIcon = () => (
  <svg width="18" height="20" viewBox="0 0 22 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
    <path d="M6 11V7a5 5 0 0 1 10 0v4" />
    <path d="M3.5 11.5c5-.6 10-.5 15 .2l-.4 9.6c-5 .6-9.7.5-14.3-.2z" />
  </svg>
);

const SpeakerIcon = ({ muted }: { muted: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
    {muted ? <path d="M16 9.5l5 5m0-5l-5 5" /> : <path d="M15.5 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />}
  </svg>
);

export function Board({
  view,
  away,
  revealed,
  act,
  playAgain,
}: {
  view: GameView;
  /** Ids of seats a bot plays while their player is offline. */
  away: string[];
  revealed: Record<string, Card>;
  act: (action: Action) => void;
  playAgain: () => void;
}) {
  const [mode, setMode] = useState<Mode>({ kind: 'idle' });
  const [muted, setMutedState] = useState(isMuted);
  const me = view.players.find((p) => p.id === view.you)!;
  const opponents = view.players.filter((p) => p !== me);
  const myTurn = view.turn === me.id;
  const step = view.step;
  const open = view.open;

  // Any change of turn, step or open card makes a half-made choice stale.
  useEffect(() => setMode({ kind: 'idle' }), [view.turn, step.kind, open?.id]);

  // The next action clears lastPeek, so the highlight runs on its own timer, restarted per new peek.
  const [peeked, setPeeked] = useState<string[]>([]);
  const peekKey = view.lastPeek?.cardIds.join(' ');
  useEffect(() => {
    if (peekKey) setPeeked(peekKey.split(' '));
  }, [peekKey]);
  useEffect(() => {
    if (!peeked.length) return;
    const timer = setTimeout(() => setPeeked([]), PEEK_HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [peeked]);

  // The stack only grows when the discard pile is shuffled back in (or a new round is dealt).
  const [stack, setStack] = useState({ count: view.stackCount, shuffles: 0 });
  if (view.stackCount !== stack.count)
    setStack({ count: view.stackCount, shuffles: stack.shuffles + Number(view.stackCount > stack.count) });

  const canMatch = view.phase !== 'ended' && !me.locked && !!open;

  /** What tapping this card does right now, or null if it is not tappable. */
  const onTap = (card: CardView, owner: PlayerView): (() => void) | null => {
    const mine = owner === me;
    const target = !owner.locked;
    if (mode.kind === 'match' && open && target)
      return mine || !me.cards.length
        ? () => act({ type: 'match', cardId: card.id, openId: open.id })
        : () => setMode({ kind: 'matchGive', target: card.id });
    if (mode.kind === 'matchGive' && open)
      return mine ? () => act({ type: 'match', cardId: mode.target, openId: open.id, give: card.id }) : null;
    if (view.phase === 'peek')
      return mine && !me.hasPeeked ? () => act({ type: 'initialPeek', cardId: card.id }) : null;
    if (!myTurn) return null;

    switch (step.kind) {
      case 'choose':
        return mode.kind === 'takeOpen' && mine ? () => act({ type: 'takeOpen', replace: card.id }) : null;
      case 'drawn':
        return mine ? () => act({ type: 'swapDrawn', replace: card.id }) : null;
      case 'peekOwn':
        return mine ? () => act({ type: 'peek', cardId: card.id }) : null;
      case 'spy':
        return !mine && target ? () => act({ type: 'peek', cardId: card.id }) : null;
      case 'blindSwap':
        if (mine) return () => setMode({ kind: 'blindOwn', own: card.id });
        return mode.kind === 'blindOwn' && target
          ? () => act({ type: 'blindSwap', own: mode.own, other: card.id })
          : null;
      case 'openSwap':
        if (!step.own) return mine ? () => act({ type: 'peek', cardId: card.id }) : null;
        return !step.other && !mine && target ? () => act({ type: 'peek', cardId: card.id }) : null;
    }
  };

  const turnName = view.players.find((p) => p.id === view.turn)?.name;
  const drawnPower = step.kind === 'drawn' && 'rank' in step.card ? powerOf(step.card as Card, view.hardMode) : null;
  const hint =
    view.phase === 'ended'
      ? 'Round over'
      : mode.kind === 'match'
        ? 'Tap a card with the same value as the open card'
        : mode.kind === 'matchGive'
          ? 'Tap one of your cards to give them in return'
          : view.phase === 'peek'
            ? me.hasPeeked
              ? 'Waiting for everyone to look at a card'
              : 'Tap one of your cards to look at it. Remember it!'
            : !myTurn
              ? `${turnName}'s turn`
              : {
                  choose:
                    mode.kind === 'takeOpen'
                      ? 'Tap the card to replace with the open card'
                      : 'Draw a card, take the open card, or swish-swish',
                  drawn: `Tap one of your cards to swap it in, or ${drawnPower ? `use it: ${POWER_LABEL[drawnPower]}` : 'put it down'}`,
                  peekOwn: 'Tap one of your cards to look at it',
                  spy: "Tap an opponent's card to look at it",
                  blindSwap: mode.kind === 'blindOwn' ? "Now tap an opponent's card" : 'Tap one of your cards to blind-swap',
                  openSwap:
                    step.kind === 'openSwap' && step.own
                      ? step.other
                        ? 'Swap these two cards?'
                        : "Tap an opponent's card to look at it"
                      : 'Tap one of your cards to look at it',
                }[step.kind];

  /** `row`: name plate beside the cards, one opponent per line, so 5 opponents fit a 360 px phone. */
  const renderHand = (player: PlayerView, size: 'sm' | 'md', row = false) => {
    const theirTurn = view.turn === player.id;
    // In a row the badges share the avatar's line, so the plate stays within the 64 px card height.
    const lock = player.locked && (
      <span title="Swish-swished: locked" className="flex rotate-6 items-center gap-1 text-sm">
        <LockIcon />
        <span className={row ? 'sr-only' : ''}>locked</span>
      </span>
    );
    const score = player.score !== undefined && (
      <span className="text-turn">
        {player.score}
        <span className={row ? 'sr-only' : ''}> pts</span>
      </span>
    );
    return (
      <section key={player.id} className={row ? 'flex items-center gap-2' : 'flex flex-col items-center gap-3'}>
        <h2
          className={`flex font-bold ${
            row ? 'w-16 shrink-0 flex-col items-start text-lg wrap-anywhere' : `flex-wrap items-center justify-center gap-x-3 ${size === 'md' ? 'text-2xl' : 'text-xl'}`
          }`}
        >
          <span className={`plate ${row ? 'flex-col items-start' : 'items-center gap-2'} ${theirTurn ? 'their-turn' : ''}`}>
            {theirTurn && <ChalkLoop />}
            <span className="flex flex-wrap items-center gap-1">
              <Avatar name={player.name} seat={view.players.indexOf(player)} />
              {row && lock}
              {row && score}
            </span>
            {player === me ? 'You' : player.name}
            {theirTurn && <span className="sr-only"> (their turn)</span>}
          </span>
          {theirTurn && player === me && <span className="-rotate-6 text-base font-normal">your go!</span>}
          {away.includes(player.id) && <span className="text-sm font-normal text-slot">away (bot playing)</span>}
          {!row && lock}
          {!row && score}
        </h2>
        <div className={`fan flex flex-wrap ${row ? 'flex-1' : 'justify-center'} ${size === 'sm' ? 'gap-0.5' : 'gap-2'} ${player.locked ? 'opacity-70 saturate-50' : ''}`}>
        {player.cards.map((card) => (
          <PlayingCard
            key={card.id}
            card={card}
            revealed={revealed[card.id]}
            size={size}
            onClick={onTap(card, player) ?? undefined}
            peeked={peeked.includes(card.id)}
            selected={
              (mode.kind === 'blindOwn' && mode.own === card.id) ||
              (mode.kind === 'matchGive' && mode.target === card.id) ||
              (step.kind === 'openSwap' && (step.own?.id === card.id || step.other?.id === card.id))
            }
          />
        ))}
          {!player.cards.length && <Slot label="no cards" size={size} />}
        </div>
      </section>
    );
  };

  const ended = view.phase === 'ended';
  const lowest = Math.min(...view.players.map((p) => p.score ?? Infinity));
  const winners = view.players.filter((p) => p.score === lowest).map((p) => (p === me ? 'You' : p.name));
  const toggle = (kind: 'match' | 'takeOpen') =>
    setMode(mode.kind === kind ? { kind: 'idle' } : { kind });

  return (
    <div className="min-h-dvh bg-rim p-2">
      <div className="felt mx-auto flex min-h-[calc(100dvh-1rem)] max-w-xl flex-col gap-3 px-4 py-4">
        <div className="flex flex-col gap-2">{opponents.map((p) => renderHand(p, 'sm', opponents.length > 1))}</div>

        <div className="flex items-end justify-center gap-7">
          <div className="relative flex flex-col items-center gap-1">
            {/* Keyed by shuffle count, so the riffle replays on every reshuffle. */}
            <div key={stack.shuffles} className={`flex ${stack.shuffles ? 'reshuffled' : ''}`}>
              {view.stackTopId ? (
                <PlayingCard
                  card={{ id: view.stackTopId }}
                  onClick={myTurn && step.kind === 'choose' ? () => act({ type: 'draw' }) : undefined}
                />
              ) : (
                <Slot label="empty" />
              )}
            </div>
            <span className="text-chalk/70">stack ({view.stackCount})</span>
          </div>
          {step.kind === 'drawn' && (
            <PlayingCard card={step.card} selected={myTurn} />
          )}
          <div className="flex flex-col items-center gap-1">
            {open ? (
              <PlayingCard
                key={open.id}
                card={open}
                onClick={myTurn && mode.kind === 'idle' && step.kind === 'choose' ? () => toggle('takeOpen') : undefined}
              />
            ) : (
              <Slot label="open" />
            )}
            <span className="text-chalk/70">open card</span>
          </div>
        </div>

        <p className="-rotate-1 px-3 text-center text-2xl font-bold text-balance" role="status">
          {hint}
        </p>

        {renderHand(me, 'md')}

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {canMatch && (
            <button className={button} aria-pressed={mode.kind === 'match' || mode.kind === 'matchGive'} onClick={() => toggle('match')}>
              Match
            </button>
          )}
          {myTurn && step.kind === 'choose' && (
            <>
              <button className={button} onClick={() => act({ type: 'draw' })} disabled={!view.stackCount}>
                Draw
              </button>
              <button className={button} aria-pressed={mode.kind === 'takeOpen'} onClick={() => toggle('takeOpen')}>
                Take open
              </button>
              <button
                className="chip"
                onClick={() => act({ type: 'swish' })}
                disabled={view.turnsTaken < view.players.length}
                title={view.turnsTaken < view.players.length ? 'Everyone needs one turn first' : undefined}
              >
                <span>
                  Swish
                  <br />
                  swish
                </span>
              </button>
            </>
          )}
          {myTurn && step.kind === 'drawn' && (
            <button className={button} onClick={() => act({ type: 'discardDrawn' })}>
              {drawnPower ? 'Use it' : 'Put it down'}
            </button>
          )}
          {myTurn && step.kind === 'openSwap' && step.own && step.other && (
            <>
              <button className={button} onClick={() => act({ type: 'openSwap', swap: true })}>
                Swap
              </button>
              <button className={button} onClick={() => act({ type: 'openSwap', swap: false })}>
                Keep
              </button>
            </>
          )}
          {myTurn && ['peekOwn', 'spy', 'blindSwap', 'openSwap'].includes(step.kind) && (
            <button className={button} onClick={() => act({ type: 'skip' })}>
              Skip
            </button>
          )}
          {ended && (
            <button className={button} onClick={playAgain}>
              Play again
            </button>
          )}
        </div>

        {ended && (
          <p className="text-center text-3xl font-bold text-turn">
            {winners.join(' & ')} {winners.length > 1 || winners[0] === 'You' ? 'win' : 'wins'} with {lowest}
          </p>
        )}

        <div className="mt-auto flex items-end gap-2">
          <ol className="flex-1" aria-label="Game log">
            {view.log.slice(-4).map((line, i, shown) => (
              // Older lines fade like rubbed-out chalk.
              <li key={view.log.length - shown.length + i} style={{ opacity: 1 - (shown.length - 1 - i) * 0.2 }}>
                {line}
              </li>
            ))}
          </ol>
          <button
            className="shrink-0 rounded-full p-2 text-chalk/80 hover:text-chalk"
            aria-label="Mute sounds"
            aria-pressed={muted}
            title={muted ? 'Sounds off' : 'Sounds on'}
            onClick={() => {
              setMuted(!muted);
              setMutedState(!muted);
            }}
          >
            <SpeakerIcon muted={muted} />
          </button>
        </div>
      </div>
    </div>
  );
}

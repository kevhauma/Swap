import { useEffect, useState } from 'react';
import {
  powerOf,
  type Action,
  type Card,
  type CardView,
  type GameView,
  type PlayerView,
} from '@swap/engine';
import { PlayingCard, Slot } from './PlayingCard.tsx';

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

const button =
  'rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-40 bg-slot text-table-deep hover:bg-white';
const activeButton = 'rounded-full px-4 py-2 text-sm font-semibold bg-turn text-table-deep';

export function Board({
  view,
  revealed,
  act,
  playAgain,
}: {
  view: GameView;
  revealed: Record<string, Card>;
  act: (action: Action) => void;
  playAgain: () => void;
}) {
  const [mode, setMode] = useState<Mode>({ kind: 'idle' });
  const me = view.players.find((p) => p.id === view.you)!;
  const opponents = view.players.filter((p) => p !== me);
  const myTurn = view.turn === me.id;
  const step = view.step;
  const open = view.open;

  // Any change of turn, step or open card makes a half-made choice stale.
  useEffect(() => setMode({ kind: 'idle' }), [view.turn, step.kind, open?.id]);

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

  const renderHand = (player: PlayerView, size: 'sm' | 'md') => (
    <section key={player.id} className={`flex flex-col items-center gap-2 ${player.locked ? 'opacity-70' : ''}`}>
      <h2 className="flex items-center gap-2 text-sm">
        <span
          aria-label={view.turn === player.id ? 'Their turn' : undefined}
          className={`size-3 rounded-full ${view.turn === player.id ? 'bg-turn' : 'bg-transparent'}`}
        />
        {player === me ? 'You' : player.name}
        {player.locked && <span title="Swish-swished: locked">🔒</span>}
        {player.score !== undefined && <span className="font-bold text-turn">{player.score} pts</span>}
      </h2>
      <div className="flex flex-wrap justify-center gap-2">
        {player.cards.map((card) => (
          <PlayingCard
            key={card.id}
            card={card}
            revealed={revealed[card.id]}
            size={size}
            onClick={onTap(card, player) ?? undefined}
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

  const ended = view.phase === 'ended';
  const lowest = Math.min(...view.players.map((p) => p.score ?? Infinity));
  const winners = view.players.filter((p) => p.score === lowest).map((p) => (p === me ? 'You' : p.name));
  const toggle = (kind: 'match' | 'takeOpen') =>
    setMode(mode.kind === kind ? { kind: 'idle' } : { kind });

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 px-4 py-4">
      <div className="flex flex-col gap-4">{opponents.map((p) => renderHand(p, 'sm'))}</div>

      <div className="flex items-center justify-center gap-4">
        <div className="relative flex flex-col items-center gap-1">
          {view.stackTopId ? (
            <PlayingCard
              card={{ id: view.stackTopId }}
              onClick={myTurn && step.kind === 'choose' ? () => act({ type: 'draw' }) : undefined}
            />
          ) : (
            <Slot label="empty" />
          )}
          <span className="text-xs text-slot">{view.stackCount} left</span>
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
          <span className="text-xs text-slot">open card</span>
        </div>
      </div>

      <p className="text-center font-medium" role="status">
        {hint}
      </p>

      {renderHand(me, 'md')}

      <div className="flex flex-wrap justify-center gap-2">
        {canMatch && (
          <button className={mode.kind === 'match' || mode.kind === 'matchGive' ? activeButton : button} onClick={() => toggle('match')}>
            Match
          </button>
        )}
        {myTurn && step.kind === 'choose' && (
          <>
            <button className={button} onClick={() => act({ type: 'draw' })} disabled={!view.stackCount}>
              Draw
            </button>
            <button className={mode.kind === 'takeOpen' ? activeButton : button} onClick={() => toggle('takeOpen')}>
              Take open
            </button>
            <button
              className={button}
              onClick={() => act({ type: 'swish' })}
              disabled={view.turnsTaken < view.players.length}
              title={view.turnsTaken < view.players.length ? 'Everyone needs one turn first' : undefined}
            >
              Swish-swish
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
          <button className={activeButton} onClick={playAgain}>
            Play again
          </button>
        )}
      </div>

      {ended && (
        <p className="text-center text-lg font-bold text-turn">
          {winners.join(' & ')} {winners.length > 1 || winners[0] === 'You' ? 'win' : 'wins'} with {lowest}
        </p>
      )}

      <ol className="mt-auto space-y-0.5 text-xs text-slot/80" aria-label="Game log">
        {view.log.slice(-4).map((line, i) => (
          <li key={view.log.length - 4 + i}>{line}</li>
        ))}
      </ol>
    </div>
  );
}

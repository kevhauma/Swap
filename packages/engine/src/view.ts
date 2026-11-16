import type { Card, CardView } from './cards.ts';
import { score, type GameState } from './game.ts';

export interface PlayerView {
  id: string;
  name: string;
  locked: boolean;
  hasPeeked: boolean;
  cards: CardView[];
  /** Only once the round has ended. */
  score?: number;
}

export type StepView =
  | { kind: 'choose' | 'peekOwn' | 'spy' | 'blindSwap' }
  | { kind: 'drawn'; card: CardView }
  | { kind: 'openSwap'; own?: CardView; other?: CardView };

/** Everything one player is allowed to know. Never contains a hidden card's face. */
export interface GameView {
  you: string;
  phase: GameState['phase'];
  hardMode: boolean;
  players: PlayerView[];
  /** Whose turn it is; null during the opening peek. */
  turn: string | null;
  step: StepView;
  open: Card | null;
  stackCount: number;
  /** Lets the client animate the drawn card out of the stack. */
  stackTopId: string | null;
  turnsTaken: number;
  swishBy: string | null;
  /** Ids only, shown to everyone; the peeker gets the face through a `reveal` or the step. */
  lastPeek: GameState['lastPeek'];
  log: string[];
}

const hide = (card: Card): CardView => ({ id: card.id });

export function viewFor(s: GameState, playerId: string): GameView {
  const ended = s.phase === 'ended';
  const active = s.phase === 'turn' && s.players[s.turn].id === playerId;
  const handCard = (id: string | undefined) =>
    s.players.flatMap((p) => p.hand).find((c) => c.id === id);
  const forActive = (card: Card | undefined) =>
    card && (active ? card : hide(card));

  return {
    you: playerId,
    phase: s.phase,
    hardMode: s.hardMode,
    players: s.players.map((p) => ({
      id: p.id,
      name: p.name,
      locked: p.locked,
      hasPeeked: p.hasPeeked,
      cards: p.hand.map((c) => (ended ? c : hide(c))),
      score: ended ? score(p) : undefined,
    })),
    turn: s.phase === 'turn' ? s.players[s.turn].id : null,
    step:
      s.step.kind === 'drawn'
        ? { kind: 'drawn', card: forActive(s.step.card)! }
        : s.step.kind === 'openSwap'
          ? {
              kind: 'openSwap',
              own: forActive(handCard(s.step.own)),
              other: forActive(handCard(s.step.other)),
            }
          : { kind: s.step.kind },
    open: s.discard.at(-1) ?? null,
    stackCount: s.stack.length,
    stackTopId: s.stack.at(-1)?.id ?? null,
    turnsTaken: s.turnsTaken,
    swishBy: s.swishBy,
    lastPeek: s.lastPeek,
    log: s.log,
  };
}

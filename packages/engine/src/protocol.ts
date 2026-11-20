import type { Card, Rank } from './cards.ts';
import type { Action, Reveal } from './game.ts';
import type { GameView } from './view.ts';

/** WebSocket messages, browser to server. */
export type ClientMessage =
  | { type: 'join'; room: string; name: string; token?: string }
  | { type: 'addBot' }
  | { type: 'removeBot'; seatId: string }
  /** `ranks`: the custom deck; omitted means the full deck. */
  | { type: 'start'; hardMode: boolean; swishPenalty: boolean; match: Match; ranks?: Rank[] }
  | { type: 'action'; action: Action };

export interface Seat {
  id: string;
  name: string;
  bot: boolean;
  online: boolean;
  /** Offline mid-game; a bot plays the seat until the player reconnects. */
  away: boolean;
}

/**
 * How a match is won. `wins`: first to `target` round wins; a single round is a target of 1.
 * `points`: round scores add up; once a total reaches `target` after a round, the lowest total wins.
 */
export type Match = { mode: 'wins'; target: number } | { mode: 'points'; target: number };

/** The room's score across rounds; the engine itself plays one round. */
export interface Tally {
  match: Match;
  /** By seat id: round wins (a shared win counts for every winner) or, in points mode, the points total. */
  totals: Record<string, number>;
  /** The match winners (wins: everyone who reached the target; points: the lowest totals); non-empty means the match is over. */
  champions: string[];
}

/** WebSocket messages, server to browser. */
export type ServerMessage =
  | { type: 'joined'; room: string; playerId: string; token: string }
  | { type: 'room'; room: string; seats: Seat[]; view: GameView | null; tally: Tally | null }
  | { type: 'reveal'; cards: Card[]; reason: Reveal['reason'] }
  | { type: 'error'; message: string };

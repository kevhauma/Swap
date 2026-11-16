import type { Card } from './cards.ts';
import type { Action, Reveal } from './game.ts';
import type { GameView } from './view.ts';

/** WebSocket messages, browser to server. */
export type ClientMessage =
  | { type: 'join'; room: string; name: string; token?: string }
  | { type: 'addBot' }
  | { type: 'start'; hardMode: boolean; match: Match }
  | { type: 'action'; action: Action };

export interface Seat {
  id: string;
  name: string;
  bot: boolean;
  online: boolean;
  /** Offline mid-game; a bot plays the seat until the player reconnects. */
  away: boolean;
}

/** How a match is won: first to `target` round wins. A single round is a target of 1. */
export interface Match {
  mode: 'wins';
  target: number;
}

/** The room's score across rounds; the engine itself plays one round. */
export interface Tally {
  match: Match;
  /** Round wins by seat id; a shared win counts for every winner. */
  wins: Record<string, number>;
  /** Seats that reached the target, several if they got there in the same round; non-empty means the match is over. */
  champions: string[];
}

/** WebSocket messages, server to browser. */
export type ServerMessage =
  | { type: 'joined'; room: string; playerId: string; token: string }
  | { type: 'room'; room: string; seats: Seat[]; view: GameView | null; tally: Tally | null }
  | { type: 'reveal'; cards: Card[]; reason: Reveal['reason'] }
  | { type: 'error'; message: string };

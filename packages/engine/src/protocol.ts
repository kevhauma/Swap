import type { Card } from './cards.ts';
import type { Action, Reveal } from './game.ts';
import type { GameView } from './view.ts';

/** WebSocket messages, browser to server. */
export type ClientMessage =
  | { type: 'join'; room: string; name: string; token?: string }
  | { type: 'addBot' }
  | { type: 'start'; hardMode: boolean }
  | { type: 'action'; action: Action };

export interface Seat {
  id: string;
  name: string;
  bot: boolean;
  online: boolean;
}

/** WebSocket messages, server to browser. */
export type ServerMessage =
  | { type: 'joined'; room: string; playerId: string; token: string }
  | { type: 'room'; room: string; seats: Seat[]; view: GameView | null }
  | { type: 'reveal'; cards: Card[]; reason: Reveal['reason'] }
  | { type: 'error'; message: string };

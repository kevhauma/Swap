import { useCallback, useEffect, useRef, useState } from 'react';
import type { Action, Card, ClientMessage, GameView, Seat, ServerMessage, Tally } from '@swap/engine';
import { play, soundFor } from './sounds.ts';

const WS_URL: string =
  import.meta.env.VITE_WS_URL ?? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
/** Peeked faces flip back after this; remembering them is the game. */
const REVEAL_MS = 2500;
const ERROR_MS = 3500;
const RECONNECT_MS = 1000;
const REPLACED_CODE = 4000;

export interface RoomState {
  code: string;
  playerId: string;
  seats: Seat[];
  view: GameView | null;
  tally: Tally | null;
}

const tokenKey = (room: string) => `swap:token:${room}`;
// Storage can be blocked (private mode); the game still works, only refresh-rejoin is lost.
export const storage = {
  get: (key: string) => {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string) => {
    try {
      sessionStorage.setItem(key, value);
    } catch {}
  },
};

export function useSwap() {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [revealed, setRevealed] = useState<Record<string, Card>>({});
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const socket = useRef<WebSocket | null>(null);

  const showError = useCallback((message: string) => {
    setError(message);
    setTimeout(() => setError((e) => (e === message ? null : e)), ERROR_MS);
  }, []);

  const reveal = useCallback((cards: Card[]) => {
    setRevealed((r) => ({ ...r, ...Object.fromEntries(cards.map((c) => [c.id, c])) }));
    setTimeout(
      () =>
        setRevealed((r) =>
          Object.fromEntries(Object.entries(r).filter(([id]) => !cards.some((c) => c.id === id)))
        ),
      REVEAL_MS
    );
  }, []);

  const disconnect = useCallback(() => {
    const ws = socket.current;
    socket.current = null;
    ws?.close();
  }, []);

  const join = useCallback(
    (code: string, name: string) => {
      disconnect();
      let playerId = '';
      let lastView: GameView | null = null;
      const open = () => {
        const ws = new WebSocket(WS_URL);
        socket.current = ws;
        const send = (m: ClientMessage) => ws.send(JSON.stringify(m));
        ws.onopen = () => {
          setConnected(true);
          send({ type: 'join', room: code, name, token: storage.get(tokenKey(code)) ?? undefined });
        };
        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data) as ServerMessage;
          if (msg.type === 'joined') {
            playerId = msg.playerId;
            storage.set(tokenKey(msg.room), msg.token);
            history.replaceState(null, '', `?room=${msg.room}`);
          } else if (msg.type === 'room') {
            play(soundFor(lastView, msg.view));
            lastView = msg.view;
            setRoom({ code: msg.room, playerId, seats: msg.seats, view: msg.view, tally: msg.tally });
          } else if (msg.type === 'reveal') {
            // Own peeks already sound from the view's lastPeek; a stack peek and a wrong match have no other signal.
            play(msg.reason === 'mismatch' ? 'wrong' : msg.reason === 'stack' ? 'flip' : null);
            reveal(msg.cards);
          } else if (msg.type === 'error') showError(msg.message);
        };
        ws.onclose = (event) => {
          if (socket.current !== ws) return;
          setConnected(false);
          if (event.code === REPLACED_CODE) showError('This seat was opened in another tab');
          else setTimeout(() => socket.current === ws && open(), RECONNECT_MS);
        };
      };
      open();
    },
    [disconnect, reveal, showError]
  );

  useEffect(() => disconnect, [disconnect]);

  const send = useCallback((m: ClientMessage) => {
    const ws = socket.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m));
  }, []);
  const act = useCallback((action: Action) => send({ type: 'action', action }), [send]);

  return { room, revealed, error, connected, join, send, act, showError };
}

export const hasToken = (room: string) => storage.get(tokenKey(room)) !== null;

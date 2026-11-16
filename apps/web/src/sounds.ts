import type { GameView } from '@swap/engine';

export type Sound = 'draw' | 'flip' | 'swap' | 'match' | 'wrong' | 'swish';

const handCards = (v: GameView) => v.players.reduce((n, p) => n + p.cards.length, 0);
const peekKey = (v: GameView) => v.lastPeek && `${v.lastPeek.by}:${v.lastPeek.cardIds.join(' ')}`;

/**
 * The sound for what changed between two server views, read from the view alone (no rules).
 * A wrong match is not here: it arrives as a `mismatch` reveal.
 */
export function soundFor(prev: GameView | null, next: GameView | null): Sound | null {
  // A fresh deal changes every hand; that is not a swap.
  if (!prev || !next || (next.phase === 'peek' && prev.phase !== 'peek')) return null;
  const had = new Map(prev.players.map((p) => [p.id, new Set(p.cards.map((c) => c.id))]));
  const gained = next.players.some((p) => p.cards.some((c) => !had.get(p.id)?.has(c.id)));
  // Locking, not swishBy: a second swish-swish in the last round leaves swishBy unchanged.
  const locked = (v: GameView) => v.players.filter((p) => p.locked).length;
  if (locked(next) > locked(prev)) return 'swish';
  if (handCards(next) < handCards(prev)) return 'match';
  if (handCards(next) === handCards(prev) && gained) return 'swap';
  if (next.step.kind === 'drawn' && prev.step.kind !== 'drawn') return 'draw';
  if ((peekKey(next) && peekKey(next) !== peekKey(prev)) || (next.phase === 'ended' && prev.phase !== 'ended'))
    return 'flip';
  return null;
}

/** Each tone: oscillator type, start and end frequency (Hz), delay and length (s). */
type Tone = [type: OscillatorType, from: number, to: number, delay: number, length: number];
// Synthesized, so no audio files ship: nothing to download or license.
const TONES: Record<Sound, Tone[]> = {
  draw: [['triangle', 320, 640, 0, 0.09]],
  flip: [['square', 1400, 700, 0, 0.035]],
  swap: [
    ['triangle', 420, 760, 0, 0.08],
    ['triangle', 760, 420, 0.09, 0.08],
  ],
  match: [
    ['sine', 660, 660, 0, 0.12],
    ['sine', 990, 990, 0.1, 0.2],
  ],
  wrong: [['sawtooth', 220, 110, 0, 0.32]],
  swish: [
    ['triangle', 1600, 300, 0, 0.13],
    ['triangle', 1600, 300, 0.17, 0.13],
  ],
};
const VOLUME = 0.15;

// Created on the first click or key press only: browsers block audio before a user gesture.
let ctx: AudioContext | undefined;
export const unlockAudio = () => {
  ctx ??= new AudioContext();
  // Mobile Safari can suspend the context again after backgrounding.
  if (ctx.state !== 'running') void ctx.resume();
};

const MUTE_KEY = 'swap:muted';
let muted: boolean | undefined;
// localStorage can be blocked (private mode); then the choice lasts for this page only.
export const isMuted = () => {
  try {
    muted ??= localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    muted = false;
  }
  return muted;
};
export const setMuted = (value: boolean) => {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {}
};

export function play(sound: Sound | null) {
  if (!sound || !ctx || isMuted()) return;
  for (const [type, from, to, delay, length] of TONES[sound]) {
    const start = ctx.currentTime + delay;
    const end = start + length;
    const osc = new OscillatorNode(ctx, { type, frequency: from });
    const gain = new GainNode(ctx, { gain: VOLUME });
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(to, end);
    gain.gain.setValueAtTime(VOLUME, start);
    gain.gain.exponentialRampToValueAtTime(0.001, end);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(end);
  }
}

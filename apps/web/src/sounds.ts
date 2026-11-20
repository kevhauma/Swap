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

/** One layer of a sound: band-passed noise (a card's swish) or a soft tone, sweeping `from` → `to` Hz. */
interface Part {
  source: 'noise' | OscillatorType;
  from: number;
  to: number;
  delay: number;
  length: number;
  volume: number;
}
const swish = (delay: number, length: number, from: number, to: number, volume = 0.5): Part => ({ source: 'noise', from, to, delay, length, volume });
const tone = (wave: OscillatorType, from: number, to: number, delay: number, length: number, volume = 0.12): Part => ({ source: wave, from, to, delay, length, volume });

// Synthesized, so no audio files ship: nothing to download or license.
const SOUNDS: Record<Sound, Part[]> = {
  draw: [swish(0, 0.16, 1200, 3200)],
  flip: [swish(0, 0.05, 3000, 5000, 0.35)],
  swap: [swish(0, 0.14, 3000, 1200), swish(0.16, 0.14, 1200, 3000)],
  match: [tone('sine', 784, 784, 0, 0.3), tone('sine', 1175, 1175, 0.09, 0.45)],
  wrong: [tone('triangle', 220, 180, 0, 0.22, 0.16), tone('triangle', 165, 130, 0.14, 0.4, 0.16)],
  swish: [swish(0, 0.3, 4000, 500, 0.6), swish(0.3, 0.3, 4000, 500, 0.6)],
};

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

let noise: AudioBuffer | undefined;

export function play(sound: Sound | null) {
  if (!sound || !ctx || isMuted()) return;
  noise ??= whiteNoise(ctx);
  for (const { source, from, to, delay, length, volume } of SOUNDS[sound]) {
    const start = ctx.currentTime + delay;
    const end = start + length;
    // A few ms of attack and an exponential tail: no click at either end.
    const gain = new GainNode(ctx, { gain: 0 });
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, end);
    gain.connect(ctx.destination);
    const node =
      source === 'noise'
        ? new AudioBufferSourceNode(ctx, { buffer: noise })
        : new OscillatorNode(ctx, { type: source, frequency: from });
    const sweep = source === 'noise' ? new BiquadFilterNode(ctx, { type: 'bandpass', Q: 1.4 }) : null;
    const frequency = sweep ? sweep.frequency : (node as OscillatorNode).frequency;
    frequency.setValueAtTime(from, start);
    frequency.exponentialRampToValueAtTime(to, end);
    if (sweep) node.connect(sweep).connect(gain);
    else node.connect(gain);
    node.start(start);
    node.stop(end + 0.02);
  }
}

const whiteNoise = (audio: AudioContext) => {
  const buffer = new AudioBuffer({ length: audio.sampleRate / 2, sampleRate: audio.sampleRate });
  buffer.getChannelData(0).forEach((_, i, data) => (data[i] = Math.random() * 2 - 1));
  return buffer;
};

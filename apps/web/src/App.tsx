import { useEffect, useState } from 'react';
import { ALL_RANKS, MAX_PLAYERS, SWISH_PENALTY, type Match } from '@swap/engine';
import { Board } from './Board.tsx';
import { unlockAudio } from './sounds.ts';
import { hasToken, storage, useSwap } from './useSwap.ts';

const NAME_KEY = 'swap:name';
const randomCode = () => Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, 'X');
const urlRoom = () => new URLSearchParams(location.search).get('room')?.toUpperCase() ?? '';

/** The lobby's match presets; the server validates whatever arrives. */
const MATCHES: [label: string, match: Match][] = [
  ['Single round', { mode: 'wins', target: 1 }],
  ...[2, 3, 5, 10].map((n): [string, Match] => [`First to ${n} round wins`, { mode: 'wins', target: n }]),
  ...[10, 30, 50].map((n): [string, Match] => [`Points to ${n}, lowest total wins`, { mode: 'points', target: n }]),
];

/** Card back designs in `public/cards/`; the pick is per device, cosmetic only. */
const BACKS = [
  ['back', 'Classic'],
  ['back-lattice', 'Lattice'],
  ['back-stripes', 'Stripes'],
  ['back-chip', 'Chip'],
] as const;
const BACK_KEY = 'swap:back';
const savedBack = () => {
  try {
    const saved = localStorage.getItem(BACK_KEY);
    return BACKS.find(([id]) => id === saved)?.[0] ?? BACKS[0][0];
  } catch {
    return BACKS[0][0];
  }
};

const input =
  'w-full rounded-lg bg-table-deep px-4 py-3 text-white placeholder:text-slot/60 outline-none focus:ring-2 focus:ring-turn';
const button =
  'rounded-full bg-slot px-5 py-2.5 font-semibold text-table-deep transition hover:bg-white disabled:opacity-40';

export function App() {
  const { room, revealed, error, connected, join, send, act } = useSwap();
  const [name, setName] = useState(() => storage.get(NAME_KEY) ?? '');
  const [code, setCode] = useState(urlRoom);
  const [hardMode, setHardMode] = useState(false);
  const [swishPenalty, setSwishPenalty] = useState(false);
  const [preset, setPreset] = useState(0);
  const [ranks, setRanks] = useState(ALL_RANKS);
  const [back, setBack] = useState(savedBack);

  useEffect(() => {
    document.documentElement.style.setProperty('--card-back', `url(/cards/${back}.svg)`);
    try {
      localStorage.setItem(BACK_KEY, back);
    } catch {}
  }, [back]);

  const enter = (roomCode: string) => {
    storage.set(NAME_KEY, name.trim());
    join(roomCode, name.trim());
  };

  // Audio may only start after a user gesture; the first click or key press unlocks it.
  useEffect(() => {
    const events = ['click', 'keydown'];
    events.forEach((e) => addEventListener(e, unlockAudio));
    return () => events.forEach((e) => removeEventListener(e, unlockAudio));
  }, []);

  // After a refresh, take the same seat back.
  useEffect(() => {
    if (code && name && hasToken(code)) join(code, name);
  }, []);

  const toast = error && (
    <div role="alert" className="fixed inset-x-4 bottom-4 mx-auto max-w-sm rounded-lg bg-red-600 px-4 py-3 text-center shadow-lg">
      {error}
    </div>
  );
  const offline = room && !connected && (
    <div className="fixed inset-x-0 top-0 bg-turn py-1 text-center text-sm text-table-deep">Reconnecting…</div>
  );

  if (!room)
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-4">
        <h1 className="text-center text-6xl font-black italic text-turn">Swap</h1>
        <p className="text-center text-slot">Lowest hand wins. Remember your cards.</p>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            enter(code);
          }}
        >
          <label className="flex flex-col gap-1 text-sm">
            Your name
            <input className={input} value={name} maxLength={20} required autoFocus onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Room code
            <input
              className={`${input} uppercase tracking-widest`}
              value={code}
              pattern="[A-Za-z0-9]{3,8}"
              placeholder="ABCD"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </label>
          <fieldset className="text-sm">
            <legend className="mb-1">Card back</legend>
            <div className="grid grid-cols-4 gap-2">
              {BACKS.map(([id, label]) => (
                <label key={id} className="flex cursor-pointer flex-col items-center gap-1">
                  <input type="radio" name="back" className="peer sr-only" checked={back === id} onChange={() => setBack(id)} />
                  <img
                    src={`/cards/${id}.svg`}
                    alt=""
                    className="aspect-[167/243] w-full rounded-md opacity-60 peer-checked:opacity-100 peer-checked:outline-3 peer-checked:outline-offset-2 peer-checked:outline-turn peer-focus-visible:ring-2 peer-focus-visible:ring-chalk"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex gap-2">
            <button className={`${button} flex-1`} disabled={!name.trim() || code.length < 3}>
              Join room
            </button>
            <button
              type="button"
              className={`${button} flex-1`}
              disabled={!name.trim()}
              onClick={() => {
                const fresh = randomCode();
                setCode(fresh);
                enter(fresh);
              }}
            >
              New room
            </button>
          </div>
        </form>
        {toast}
      </main>
    );

  const view = room.view;
  if (view)
    return (
      <>
        {offline}
        <Board
          view={view}
          away={room.seats.filter((s) => s.away).map((s) => s.id)}
          revealed={revealed}
          tally={room.tally}
          act={act}
          playAgain={() => send({ type: 'start', hardMode: view.hardMode, swishPenalty: view.swishPenalty, match: room.tally?.match ?? { mode: 'wins', target: 1 }, ranks: view.ranks })}
        />
        {toast}
      </>
    );

  const link = `${location.origin}${location.pathname}?room=${room.code}`;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-5 px-4">
      {offline}
      <h1 className="text-center text-2xl font-bold">
        Room <span className="tracking-widest text-turn">{room.code}</span>
      </h1>
      <button className="text-sm text-slot underline" onClick={() => navigator.clipboard?.writeText(link)}>
        Copy invite link
      </button>
      <ul className="divide-y divide-slot/20 rounded-lg bg-table-deep">
        {room.seats.map((seat) => (
          <li key={seat.id} className="flex justify-between px-4 py-3">
            <span>
              {seat.name}
              {seat.id === room.playerId && ' (you)'}
            </span>
            <span className="text-sm text-slot">{seat.bot ? 'bot' : seat.away ? 'away (bot playing)' : seat.online ? 'ready' : 'offline'}</span>
          </li>
        ))}
      </ul>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={hardMode} onChange={(e) => setHardMode(e.target.checked)} />
        Hard mode (3s cost a card, 6s show the top of the stack)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={swishPenalty} onChange={(e) => setSwishPenalty(e.target.checked)} />
        Swish penalty (+{SWISH_PENALTY} points if the caller is not lowest)
      </label>
      {/* Removing a rank removes its cards and their power; the server rejects a deck too small to deal. */}
      <fieldset className="text-sm">
        <legend className="mb-1">Cards in the deck</legend>
        <div className="grid grid-cols-7 gap-1">
          {ALL_RANKS.map((rank) => (
            <label key={rank} className="cursor-pointer">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={ranks.includes(rank)}
                onChange={(e) => setRanks(ALL_RANKS.filter((r) => (r === rank ? e.target.checked : ranks.includes(r))))}
              />
              <span className="block rounded-md bg-table-deep py-1.5 text-center text-slot/50 line-through peer-checked:bg-slot peer-checked:text-table-deep peer-checked:no-underline peer-focus-visible:ring-2 peer-focus-visible:ring-turn">
                {rank === 'JOKER' ? 'Joker' : rank}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center justify-between gap-2 text-sm">
        Play
        <select className="rounded-lg bg-table-deep px-3 py-2" value={preset} onChange={(e) => setPreset(Number(e.target.value))}>
          {MATCHES.map(([label], i) => (
            <option key={label} value={i}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <button className={`${button} flex-1`} onClick={() => send({ type: 'addBot' })} disabled={room.seats.length >= MAX_PLAYERS}>
          Add bot
        </button>
        <button
          className={`${button} flex-1`}
          onClick={() => send({ type: 'start', hardMode, swishPenalty, match: MATCHES[preset][1], ranks })}
          disabled={room.seats.length < 2}
        >
          Start
        </button>
      </div>
      {toast}
    </main>
  );
}

import { useEffect, useState } from 'react';
import { MAX_PLAYERS } from '@swap/engine';
import { Board } from './Board.tsx';
import { hasToken, storage, useSwap } from './useSwap.ts';

const NAME_KEY = 'swap:name';
const randomCode = () => Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, 'X');
const urlRoom = () => new URLSearchParams(location.search).get('room')?.toUpperCase() ?? '';

const input =
  'w-full rounded-lg bg-table-deep px-4 py-3 text-white placeholder:text-slot/60 outline-none focus:ring-2 focus:ring-turn';
const button =
  'rounded-full bg-slot px-5 py-2.5 font-semibold text-table-deep transition hover:bg-white disabled:opacity-40';

export function App() {
  const { room, revealed, error, connected, join, send, act } = useSwap();
  const [name, setName] = useState(() => storage.get(NAME_KEY) ?? '');
  const [code, setCode] = useState(urlRoom);
  const [hardMode, setHardMode] = useState(false);

  const enter = (roomCode: string) => {
    storage.set(NAME_KEY, name.trim());
    join(roomCode, name.trim());
  };

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
          act={act}
          playAgain={() => send({ type: 'start', hardMode: view.hardMode })}
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
      <div className="flex gap-2">
        <button className={`${button} flex-1`} onClick={() => send({ type: 'addBot' })} disabled={room.seats.length >= MAX_PLAYERS}>
          Add bot
        </button>
        <button
          className={`${button} flex-1`}
          onClick={() => send({ type: 'start', hardMode })}
          disabled={room.seats.length < 2}
        >
          Start
        </button>
      </div>
      {toast}
    </main>
  );
}

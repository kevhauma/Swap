import { once } from 'node:events';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, join as path } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createGame, type ClientMessage, type Ctx, type ServerMessage } from '@swap/engine';
import { startServer } from './index.ts';

type Message<T extends ServerMessage['type']> = Extract<ServerMessage, { type: T }>;
interface Client {
  ws: WebSocket;
  msgs: ServerMessage[];
  closeCode?: number;
  send: (message: ClientMessage) => void;
}

// With random() = 0.5 the first player is dealt a 3 and the open card is a 3 (see the match test).
const fixedCtx = (): Ctx => {
  let n = 0;
  return { random: () => 0.5, id: () => `c${n++}` };
};

// A stand-in for apps/web/dist, plus a sibling file outside it that must never be served.
const web = mkdtempSync(path(tmpdir(), 'swap-web-'));
mkdirSync(path(web, 'assets'));
writeFileSync(path(web, 'index.html'), '<h1>Swap</h1>');
writeFileSync(path(web, 'assets', 'app-1a2b.js'), 'ok');
writeFileSync(`${web}-secret.txt`, 'secret');

const clients: Client[] = [];
let server: ReturnType<typeof startServer>;
let url = '';
let http = '';
let timersBefore = 0;
const timers = () => process.getActiveResourcesInfo().filter((r) => r === 'Timeout').length;

beforeAll(async () => {
  timersBefore = timers();
  server = startServer(0, fixedCtx(), web);
  await once(server, 'listening');
  http = `http://localhost:${(server.address() as AddressInfo).port}`;
  url = `${http.replace('http', 'ws')}/ws`;
});
afterEach(() =>
  Promise.all(
    clients.splice(0).map((c) => {
      c.ws.close();
      return vi.waitFor(() => expect(c.closeCode).toBeDefined());
    })
  )
);
afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  // Room, away and heartbeat timers are all cleared; only Vitest's own hook timer remains.
  expect(timers()).toBe(timersBefore);
});

const connect = async () => {
  const ws = new WebSocket(url);
  const c: Client = { ws, msgs: [], send: (message) => ws.send(JSON.stringify(message)) };
  ws.onmessage = (e) => c.msgs.push(JSON.parse(String(e.data)));
  ws.onclose = (e) => (c.closeCode = e.code);
  clients.push(c);
  await once(ws, 'open');
  return c;
};

/** The latest message of `type` (matching `ok`), waiting for it to arrive. */
const latest = <T extends ServerMessage['type']>(c: Client, type: T, ok: (m: Message<T>) => boolean = () => true) =>
  vi.waitFor(() => {
    const message = (c.msgs.filter((m) => m.type === type) as Message<T>[]).findLast(ok);
    expect(message, `a ${type} message`).toBeDefined();
    return message!;
  });

const join = async (room: string, name: string, token?: string) => {
  const c = await connect();
  c.send({ type: 'join', room, name, token });
  return { c, joined: await latest(c, 'joined') };
};

describe('server rooms', () => {
  it('sends the seat list to both clients in a room', async () => {
    const alice = await join('TWO', 'Alice');
    const bob = await join('TWO', 'Bob');
    for (const { c } of [alice, bob]) {
      const room = await latest(c, 'room', (m) => m.seats.length === 2);
      expect(room.seats.map((s) => s.name)).toEqual(['Alice', 'Bob']);
    }
  });

  it('gives a reconnecting player the same seat via the token', async () => {
    const first = await join('RECON', 'Alice');
    first.c.ws.close();
    await vi.waitFor(() => expect(first.c.closeCode).toBeDefined());
    const again = await join('RECON', 'Alice', first.joined.token);
    expect(again.joined.playerId).toBe(first.joined.playerId);
  });

  it('closes the old socket with 4000 when the seat joins from another socket', async () => {
    const first = await join('TABS', 'Alice');
    const second = await join('TABS', 'Alice', first.joined.token);
    expect(second.joined.playerId).toBe(first.joined.playerId);
    await vi.waitFor(() => expect(first.c.closeCode).toBe(4000));
  });

  it('rejects the second of two matches on one open card as too late, without penalty', async () => {
    const alice = await join('RACE', 'Alice');
    const bob = await join('RACE', 'Bob');
    alice.c.send({ type: 'start', hardMode: false, swishPenalty: false, match: { mode: 'wins', target: 1 } });
    const { seats, view } = await latest(bob.c, 'room', (m) => m.view !== null);
    // The server's Ctx is fresh and deterministic, so the same deal can be rebuilt here.
    const deal = createGame(seats, { hardMode: false }, fixedCtx());
    const open = view!.open!;
    const three = deal.players[0].hand.find((card) => card.rank === open.rank)!;
    expect(three, 'Alice holds a card matching the open card').toBeDefined();

    alice.c.send({ type: 'action', action: { type: 'match', cardId: three.id, openId: open.id } });
    await latest(bob.c, 'room', (m) => m.view?.open?.id === three.id);
    const bobCard = deal.players[1].hand[0].id;
    bob.c.send({ type: 'action', action: { type: 'match', cardId: bobCard, openId: open.id } });

    expect((await latest(bob.c, 'error')).message).toMatch(/^Too late/);
    const after = (await latest(bob.c, 'room')).view!;
    expect(after.players.find((p) => p.id === bob.joined.playerId)!.cards).toHaveLength(4);
    expect(bob.c.msgs.some((m) => m.type === 'reveal' && m.reason === 'mismatch')).toBe(false);
  });

  // Runs after the race test, which needs the server's Ctx to be untouched by earlier games.
  it('keeps the round-win tally across rounds until the target, then starts a new match', async () => {
    const players = [await join('MATCH', 'Alice'), await join('MATCH', 'Bob')];
    const [alice] = players;
    alice.c.send({ type: 'start', hardMode: true, swishPenalty: false, match: { mode: 'nope', target: 2 } as never });
    expect((await latest(alice.c, 'error')).message).toMatch(/round wins/);

    /** Starts a round; everyone peeks, takes the open card until all had a turn, then swishes. */
    const playRound = async (target: number) => {
      players.forEach(({ c }) => (c.msgs.length = 0));
      alice.c.send({ type: 'start', hardMode: false, swishPenalty: false, match: { mode: 'wins', target } });
      const first = await latest(alice.c, 'room', (m) => m.view?.phase === 'peek');
      for (const { c } of players) {
        const { view } = await latest(c, 'room', (m) => m.view?.phase === 'peek');
        c.send({ type: 'action', action: { type: 'initialPeek', cardId: view!.players.find((p) => p.id === view!.you)!.cards[0].id } });
      }
      for (let done = first; done.view!.phase !== 'ended'; ) {
        const logged = done.view!.log.length;
        const turn = done.view!.turn;
        const player = players.find((p) => p.joined.playerId === turn);
        if (player) {
          const view = done.view!;
          const own = view.players.find((p) => p.id === turn)!.cards[0].id;
          player.c.send({ type: 'action', action: view.turnsTaken < 2 ? { type: 'takeOpen', replace: own } : { type: 'swish' } });
        }
        done = await latest(alice.c, 'room', (m) => m.view!.log.length > logged);
      }
      const ended = await latest(alice.c, 'room', (m) => m.view?.phase === 'ended');
      const lowest = Math.min(...ended.view!.players.map((p) => p.score!));
      return { tally: ended.tally!, winners: ended.view!.players.filter((p) => p.score === lowest).map((p) => p.id) };
    };

    const first = await playRound(2);
    expect(first.tally.totals).toEqual(Object.fromEntries(first.winners.map((id) => [id, 1])));
    expect(first.tally.champions).toEqual([]);

    // Mid-match the server keeps the match's mode, whatever the next start says.
    const second = await playRound(1);
    expect(second.tally.match.target).toBe(2);
    for (const id of second.winners) expect(second.tally.totals[id]).toBe((first.tally.totals[id] ?? 0) + 1);
    const champions = Object.keys(second.tally.totals).filter((id) => second.tally.totals[id] === 2);
    expect(second.tally.champions).toEqual(champions);

    // The fixed Ctx deals every round alike, so the same winners reach 2.
    expect(champions).toEqual(first.winners);
    alice.c.msgs.length = 0;
    alice.c.send({ type: 'start', hardMode: false, swishPenalty: false, match: { mode: 'wins', target: 3 } });
    const fresh = await latest(alice.c, 'room', (m) => m.view?.phase === 'peek');
    expect(fresh.tally).toEqual({ match: { mode: 'wins', target: 3 }, totals: {}, champions: [] });
  });

  it('passes the chosen ranks to the engine; a rejected deck leaves the room as it was', async () => {
    const alice = await join('DECK', 'Alice');
    await join('DECK', 'Bob');
    alice.c.send({ type: 'start', hardMode: false, swishPenalty: false, match: { mode: 'wins', target: 1 }, ranks: ['A', '2'] });
    expect((await latest(alice.c, 'error')).message).toMatch(/Too few cards/);
    alice.c.send({ type: 'start', hardMode: false, swishPenalty: false, match: { mode: 'wins', target: 3 }, ranks: ['A', 'K', 'JOKER'] });
    const { view, tally } = await latest(alice.c, 'room', (m) => m.view !== null);
    expect(view!.ranks).toEqual(['A', 'K', 'JOKER']);
    expect(tally!.match.target).toBe(3);
  });
});

describe('web client on the same port', () => {
  it('serves the page and its hashed assets', async () => {
    const page = await fetch(`${http}/`);
    expect(page.status).toBe(200);
    expect(page.headers.get('content-type')).toMatch(/^text\/html/);
    expect(await page.text()).toBe('<h1>Swap</h1>');
    const asset = await fetch(`${http}/assets/app-1a2b.js`);
    expect(asset.headers.get('content-type')).toMatch(/^text\/javascript/);
    expect(asset.headers.get('cache-control')).toContain('immutable');
  });

  it('never serves a file outside the web root', async () => {
    const secret = `${basename(web)}-secret.txt`;
    for (const path of [`/../${secret}`, `/..%2F${secret}`, `/%2E%2E%2F${secret}`, `/%2F..%2F${secret}`, '/missing.js'])
      expect((await fetch(http + path)).status, path).toBe(404);
    expect((await fetch(`${http}/%E0%A4%A`)).status).toBe(400);
  });

  it('accepts only GET and HEAD', async () => {
    expect((await fetch(`${http}/`, { method: 'POST' })).status).toBe(405);
  });
});

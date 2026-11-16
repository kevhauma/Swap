import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
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

const clients: Client[] = [];
let server: ReturnType<typeof startServer>;
let url = '';
let timersBefore = 0;
const timers = () => process.getActiveResourcesInfo().filter((r) => r === 'Timeout').length;

beforeAll(async () => {
  timersBefore = timers();
  server = startServer(0, fixedCtx());
  await once(server, 'listening');
  url = `ws://localhost:${(server.address() as AddressInfo).port}`;
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
    alice.c.send({ type: 'start', hardMode: false });
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
});

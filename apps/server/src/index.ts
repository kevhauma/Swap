import { randomInt, randomUUID } from 'node:crypto';
import { WebSocketServer, type WebSocket } from 'ws';
import {
  apply,
  botAction,
  createGame,
  MAX_PLAYERS,
  remember,
  RuleError,
  viewFor,
  type Action,
  type BotMemory,
  type ClientMessage,
  type Ctx,
  type GameState,
  type Reveal,
  type ServerMessage,
} from '@swap/engine';

interface Seat {
  id: string;
  name: string;
  token: string;
  socket: WebSocket | null;
  bot: { memory: BotMemory; timer?: NodeJS.Timeout } | null;
}

interface Room {
  code: string;
  seats: Seat[];
  game: GameState | null;
  cleanup?: NodeJS.Timeout;
}

const PORT = Number(process.env.PORT ?? 3001);
const BOT_DELAY_MS = 1200;
const EMPTY_ROOM_TTL_MS = 10 * 60_000;
const HEARTBEAT_MS = 30_000;

const ctx: Ctx = {
  random: () => randomInt(2 ** 32) / 2 ** 32,
  id: () => randomUUID().slice(0, 8),
};
const rooms = new Map<string, Room>();
const alive = new WeakSet<WebSocket>();

const send = (socket: WebSocket | null, message: ServerMessage) => {
  if (socket && socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
};

const broadcast = (room: Room) => {
  const seats = room.seats.map((s) => ({ id: s.id, name: s.name, bot: !!s.bot, online: !!s.bot || !!s.socket }));
  for (const seat of room.seats)
    send(seat.socket, { type: 'room', room: room.code, seats, view: room.game && viewFor(room.game, seat.id) });
  room.seats.forEach((seat) => seat.bot && scheduleBot(room, seat));
};

const deliver = (room: Room, reveals: Reveal[]) => {
  for (const { to, cards, reason } of reveals)
    for (const seat of room.seats.filter((s) => to === 'all' || to === s.id)) {
      if (seat.bot) remember(seat.bot.memory, cards);
      send(seat.socket, { type: 'reveal', cards, reason });
    }
};

/** Applies an action; rule violations are reported to the sender only. */
const act = (room: Room, seat: Seat, action: Action) => {
  if (!room.game) throw new RuleError('The game has not started');
  const { state, reveals } = apply(room.game, seat.id, action, ctx);
  room.game = state;
  deliver(room, reveals);
  broadcast(room);
};

const scheduleBot = (room: Room, seat: Seat) => {
  const bot = seat.bot!;
  clearTimeout(bot.timer);
  if (room.game?.phase !== 'ended')
    bot.timer = setTimeout(() => {
      // Decide on the state at fire time, not at schedule time.
      const action = room.game && botAction(viewFor(room.game, seat.id), bot.memory);
      if (!action) return;
      try {
        act(room, seat, action);
      } catch (error) {
        console.error(`Bot ${seat.name} made an invalid move`, action, error);
      }
    }, BOT_DELAY_MS);
};

const join = (socket: WebSocket, msg: Extract<ClientMessage, { type: 'join' }>): [Room, Seat] => {
  const code = String(msg.room).toUpperCase();
  const name = String(msg.name).trim().slice(0, 20);
  if (!/^[A-Z0-9]{3,8}$/.test(code)) throw new RuleError('Room codes are 3 to 8 letters or digits');
  if (!name) throw new RuleError('Enter a name');

  const room = rooms.get(code) ?? { code, seats: [], game: null };
  rooms.set(code, room);
  clearTimeout(room.cleanup);

  let seat = room.seats.find((s) => !s.bot && s.token === msg.token);
  if (!seat) {
    if (room.game && room.game.phase !== 'ended') throw new RuleError('That game has already started');
    if (room.seats.length >= MAX_PLAYERS) throw new RuleError('The room is full');
    seat = { id: randomUUID().slice(0, 8), name, token: randomUUID(), socket: null, bot: null };
    room.seats.push(seat);
  }
  if (seat.socket && seat.socket !== socket) seat.socket.close(4000, 'Joined from another tab');
  seat.socket = socket;
  send(socket, { type: 'joined', room: code, playerId: seat.id, token: seat.token });
  broadcast(room);
  return [room, seat];
};

const wss = new WebSocketServer({ port: PORT, maxPayload: 4096 });

wss.on('connection', (socket) => {
  let joined: [Room, Seat] | null = null;
  alive.add(socket);
  socket.on('pong', () => alive.add(socket));

  socket.on('message', (data) => {
    try {
      const msg = JSON.parse(String(data)) as ClientMessage;
      if (msg?.type === 'join') {
        if (joined) throw new RuleError('Already in a room');
        joined = join(socket, msg);
        return;
      }
      if (!joined) throw new RuleError('Join a room first');
      const [room, seat] = joined;
      switch (msg.type) {
        case 'addBot':
          if (room.game && room.game.phase !== 'ended') throw new RuleError('The game is running');
          if (room.seats.length >= MAX_PLAYERS) throw new RuleError('The room is full');
          room.seats.push({
            id: randomUUID().slice(0, 8),
            name: `Bot ${room.seats.filter((s) => s.bot).length + 1}`,
            token: randomUUID(),
            socket: null,
            bot: { memory: {} },
          });
          broadcast(room);
          break;
        case 'start':
          if (room.game && room.game.phase !== 'ended') throw new RuleError('The game is running');
          room.seats.forEach((s) => s.bot && (s.bot.memory = {}));
          room.game = createGame(room.seats, { hardMode: msg.hardMode === true }, ctx);
          broadcast(room);
          break;
        case 'action':
          if (typeof msg.action !== 'object' || msg.action === null) throw new RuleError('Bad action');
          act(room, seat, msg.action);
          break;
        default:
          throw new RuleError('Unknown message');
      }
    } catch (error) {
      if (!(error instanceof RuleError || error instanceof SyntaxError)) console.error(error);
      send(socket, { type: 'error', message: error instanceof RuleError ? error.message : 'Bad message' });
    }
  });

  socket.on('close', () => {
    if (!joined) return;
    const [room, seat] = joined;
    if (seat.socket !== socket) return;
    seat.socket = null;
    broadcast(room);
    if (room.seats.every((s) => s.bot || !s.socket))
      room.cleanup = setTimeout(() => {
        room.seats.forEach((s) => clearTimeout(s.bot?.timer));
        rooms.delete(room.code);
      }, EMPTY_ROOM_TTL_MS);
  });
});

// Mobile networks drop sockets silently; ping and terminate the ones that stop answering.
setInterval(() => {
  for (const socket of wss.clients) {
    if (!alive.has(socket)) socket.terminate();
    else {
      alive.delete(socket);
      socket.ping();
    }
  }
}, HEARTBEAT_MS);

console.log(`Swap server listening on ws://localhost:${PORT}`);

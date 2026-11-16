# Swap — Game Overview & Web Stack Proposal

Source: `Swap rules_.pdf` (rules + one 3D table render + two 2D layout mocks).

---

## 1. The game in one paragraph

Swap is a memory-and-bluff card game for 2+ players. Each player has 4 face-down cards and
**wants the lowest total at the end**. You only ever see your cards briefly, so you have to
remember them, use power cards to peek and swap, and dump cards that match the open discard.
When you think your hand is low, you call **"swish-swish"**, your cards get locked, everyone
else gets one last turn, then everyone reveals and the lowest score wins.

## 2. Components

- Standard 52-card deck + 2 Jokers. (Later option: a custom deck setting to pick which card
  sets are in play, like another game the group played.)
- Per player: a row of 4 face-down cards.
- Centre: draw **stack** (face down) and **open card** (top of the discard pile).

## 3. Card values and powers

| Card | Points | Power when drawn from the stack and *used* (discarded) |
|---|---|---|
| Red K | **-1** | none |
| Joker | **0** | none |
| A | 1 | none |
| 2–6 | face value | none (Hard mode: 6, see below) |
| 7, 8 | 7, 8 | **Peek** at one of your own cards |
| 9, 10 | 9, 10 | **Spy**: peek at one opponent card |
| J, Q | 11, 12 | **Blind swap**: swap one of yours with one of an opponent's, nobody looks |
| Black K | **13** | **Open swap**: look at one of yours, then one of an opponent's, then choose to swap or not |

Best possible hand: **-2** (two red kings + two jokers, or fewer cards through matching).

## 4. Flow of a round

1. **Deal**: 4 cards face down per player, then flip the top card of the remaining stack to
   start the discard pile (it is never one of the players' cards).
2. **First peek**: every player looks at **one** of their own cards. If it matches the open
   card's rank, they may place it straight away.
3. **Turns** (clockwise). On your turn pick one:
   1. **Take the open card** and swap it with one of your cards (everyone saw what you took).
   2. **Draw from the stack**, look at it, swap it with one of your cards. The replaced card goes
      face up on the discard pile.
   3. **Draw from the stack and use it**: discard it and trigger its power (if it has one).
4. **Matching (any time, out of turn)**: if you know a card (yours *or an opponent's*) has the
   same rank as the open card (same number or letter, colour does not matter), place it on the
   discard pile.
   - Placing your own card: your hand shrinks.
   - Placing an opponent's card: you then give that opponent one of your cards.
   - **Wrong match** (rank does not match): you get a penalty card from the stack, face down,
     and you may not look at it.
5. **Swish-swish**: when confident, a player calls it. Their cards are **locked** (no power or
   match can touch them). Every other player gets exactly one more turn.
6. **Reveal & score**: sum the card values; lowest total wins.

### Hard mode

- **3s**: whenever you put a 3 down (except by matching the open card), you draw an unknown
  penalty card.
- **6s**: power: look at the top 3 cards of the stack, without changing the order.

## 5. Rule gaps to settle before coding

The digital version must decide these; the PDF leaves them open. Rows marked *rules.txt*
were answered in the notes of the previous attempt (`rules.txt`, commit `d9dad6f`).
These are the rules the engine implements.

| # | Question | Decision |
|---|---|---|
| 1 | How many Jokers? Deck size for 5+ players? | 2 Jokers; 2 decks above 4 players. Custom deck (choose card sets) later |
| 2 | Two players match the same open card at once | Server-ordered: first message wins, second gets "too late", no penalty |
| 3 | When is matching allowed? ("in between rounds") | Any time, against the current open card; no restrictions in the real game, so whatever the server handles. MVP: during the deal peek and the turns |
| 3a | What does "matches" mean? | Same **rank**: the same number or letter on the card, not the point value. Colour does not matter: a red K matches a black K, a Joker matches a Joker |
| 3b | Where does a used power card go? | It becomes the open card (*rules.txt*) |
| 3c | Taking the open card: what is open next? | The card you swap out goes on top and becomes the open card |
| 3d | Do others see *which* card is peeked at? | Yes, the position, never the value (*rules.txt*) |
| 3e | Locked (swish-swished) players | Their cards can't be swapped or matched, and they can't match either |
| 3f | Can others swish after someone swished? | Yes; it locks them and uses up their last turn (*rules.txt*) |
| 4 | Can a power be used from the **open** card? | No, only from a fresh stack draw (rule 4.3) |
| 5 | Hard-mode 3: does swapping a 3 *out* of your hand count as "placing"? | Yes, any discard except a match |
| 6 | When can you call swish-swish? | Instead of taking your turn; not before everyone had one turn |
| 7 | Stack runs out | Reshuffle the discard pile, except the open card |
| 8 | Ties, single round or match to N points? | Single round MVP, shared win on ties. Later game modes: count round **wins** (how it is played now), or add up points and play to a target (e.g. 10 or 30) |
| 9 | Penalty if the swish caller is *not* lowest? | None (as written); optional house rule later |
| 10 | Does the UI remember peeked cards for you? | **No**: memory is the game. Show a peek for ~2 s, then flip back |

## 6. What the mocks tell us

- Layout (page 3): opponent row on top, stack + open card in the middle, your row at the
  bottom, a **turn indicator** dot next to the active player. Portrait, phone-first.
- The 3D render (page 2) shows the mood: dark wood table, red card backs, an opponent avatar
  ("Salat") and a timer. Borrow the mood only: the game stays **2D**.
- Mocks are **2-player**. The engine should support 2–6 anyway; it costs nothing. With more
  players there is still **one winner** (lowest score), no ranking of the others.

---

## 7. Web stack proposal

### What the game actually needs

- **Hidden information**: a card's value must never reach a browser that is not allowed to see
  it. So the **server is authoritative** and sends each player a redacted view. (Browser
  devtools would otherwise show every card.)
- **Mostly turn-based**, plus one real-time race (matching).
- Few on-screen objects (~15 cards): no game engine or canvas required.
- Phone-first, shareable "join by link" rooms.

### Recommendation

| Layer | Choice | Why |
|---|---|---|
| Language | **TypeScript** everywhere | One type set for engine, server and client |
| Repo | **npm workspaces** monorepo: `packages/engine`, `apps/server`, `apps/web` | Engine shared by server, client and bots; npm ships with Node, nothing extra to install |
| Runtime | Node 24+ runs the server's `.ts` files directly (type stripping) | No build step for engine or server |
| Rules engine | **Pure TS reducer**: `apply(state, action) → state` + `viewFor(state, playerId)` | Declarative, deterministic, trivially testable; no framework lock-in |
| Engine tests | **Vitest** | Every rule and every gap decision above becomes a test |
| Realtime server | **Node + plain WebSockets** (`ws` package on the server, native `WebSocket` in the browser), in-memory rooms | No protocol layer to learn or debug; turn rate is low, one small instance holds many games |
| Client | **React + Vite** | Renders the server's view; no client-side game logic |
| Card visuals | **DOM/SVG cards + Motion** (`motion`, formerly framer-motion) for flip/swap/slide | 15 elements do not need PixiJS/Phaser; `layoutId` animates exchanges, CSS 3D transforms give a real card flip |
| Styling | Tailwind CSS | Fast to match the mocks |
| Bots | Heuristic bot in `packages/engine` (remembers what it peeked, swaps high for low, calls swish below a threshold) | Single-player mode and fills empty seats |
| Persistence | **None for MVP** (no accounts; room code + nickname). Add Redis only for multi-instance or crash recovery | Nothing to store yet |
| Hosting | Static client on Cloudflare Pages / Netlify; server on Fly.io or Render (one instance, WebSockets) | Cheap, WebSocket-friendly |

### How hidden info flows

```
client --(action: draw / swap / match / swish)--> server
server: state = apply(state, action)        // validates turn, rank, locks, penalties
server --(viewFor(state, p))--> each player p  // own unknown cards = null, opponents' = null
server --(private event)--> peeking player only  // { card, expiresInMs: 2000 }
```

Peek results go only to the player who peeked and are never stored in their view. The client
shows them briefly and forgets them.

### What plain WebSockets leave to us

Socket.IO would give these for free; with `ws` they are ours, but each is small:

- **Rooms**: a `Map<roomCode, { state, sockets: Map<playerId, WebSocket> }>`; broadcast =
  loop over the room's sockets and send each its own `viewFor(...)`.
- **Messages**: JSON envelope `{ type, ...payload }`, typed as a discriminated union in
  `packages/engine` and shared with the client. Validate every incoming message on the server
  (it is a trust boundary).
- **Reconnect**: on join the server issues a random `sessionToken`; the client keeps it in
  `sessionStorage` and sends it on reconnect to reclaim the seat. The server then resends the
  full current view, so no message replay is needed.
- **Liveness**: `ws` ping/pong every ~30 s to drop dead sockets (mobile networks drop silently).
- **Ordering of the match race**: Node handles messages one at a time, so the first match
  message processed wins. No extra locking.

Node 22+ has a built-in WebSocket *client*, but no server, hence the single `ws` dependency.

### Card exchange animations with Motion

Motion handles exchanges well through **shared layout animations**: render each card with a
`layoutId`; when the next server view puts that id in a different slot (your row, an
opponent's row, the discard pile), Motion measures both positions and animates the card
between them. Both cards of a swap move at once, with no imperative animation code. Wrap
the board in `<LayoutGroup>` so cards can move between separate row components.

This needs one thing from the engine: **every physical card gets a stable, opaque id**
(random, not derived from its value), included in each view even for face-down cards.
Actions name cards by this id, not by slot index, so a match that removes a card mid-turn
can't make someone else's click land on the wrong slot.

- That id must never reveal the value: generate it randomly per deal, not `"7H"`.
- **Re-issue ids on reshuffle.** Otherwise a card seen face up on the discard pile is
  recognisable by its id when someone later draws it.
- Flip = a separate `rotateY` animation on the card's inner element (front/back faces with
  `backface-visibility: hidden`), independent of the layout move.

Limits: layout animations move in a straight line (an arc or "lift" needs custom keyframes),
and they are not corrected for rotated parents. Keep opponent rows unrotated, as in the
mocks, or accept a slightly off path.

### Alternatives considered

- **boardgame.io**: built for this (secret state via `playerView`, turns, bots), but development
  has been mostly dormant for years. Good reference, risky dependency.
- **Socket.IO**: rooms, reconnect and acks built in, but its own protocol on top of
  WebSockets; the pieces this game needs are small enough to write on plain `ws` (see above).
- **Colyseus**: solid rooms/matchmaking; its auto state-sync broadcasts by default, so hidden
  cards need its filtering layer. Worth it if you later want public matchmaking.
- **Phaser / PixiJS**: only pays off with many sprites or physics. Not needed here.
- **Cloudflare Durable Objects / PartyKit**: nice "one room = one object" hosting; pick this
  instead of Fly.io if you want serverless with no idle server.

### Build order

1. **Engine + tests**: deal, turns, powers, matching (incl. opponent cards and penalties),
   swish-swish lock + last round, scoring, hard mode. Settle the gaps in section 5 here.
2. **Online rooms + bots**: `ws` server, join by link, session-token reconnect, ping/pong,
   match race ordering. Bots sit in server rooms, so single-player uses the same path as
   multiplayer (no separate client-only mode to maintain).
3. **Web client** for the mocks' layout: draw / take / swap / powers / match / swish.
4. **Polish**: animations, sounds, hard-mode toggle, 2–6 players, game modes (wins / points target).

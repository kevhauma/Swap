# Swap — Plan & Tickets

Built from [GAME_OVERVIEW.md](GAME_OVERVIEW.md) (incl. the latest rule decisions) checked against the
code on `rewrite`. Build order steps 1–3 (engine, online rooms + bots, web client) are in place;
what is left is closing gaps with the docs, making real games with friends hold up, then polish
and the "later" options.

**Priorities**

- **P0**: the code contradicts a rule decision. Fix first.
- **P1**: needed before playing with friends over the internet.
- **P2**: polish (build order step 4).
- **P3**: options the docs mark as "later".

## Already matching the docs

Deal (open card = top of the remaining stack), turns, all powers, hard mode, matching own and
opponent cards, wrong-match penalty, "too late" race, locks (3e), swish after swish (3f), swish
only after one round (6), reshuffle with new ids (7), single round with shared win (8), peeks
flip back after 2.5 s (10), `ws` rooms, token reconnect, heartbeat, bots, Motion `layoutId` +
flip, hard-mode toggle.

---

## Tickets

One file per ticket in [tickets/](tickets/).

| Ticket | Priority | Area | Title | Status |
|---|---|---|---|---|
| [ENG-1](tickets/ENG-1.md) | P0 | Engine | Match by rank, not by point value | done |
| [ENG-2](tickets/ENG-2.md) | P1 | Engine | Player count 2–6 vs 2–8 | open |
| [ENG-3](tickets/ENG-3.md) | P1 | Engine | Show *which* card was peeked to everyone | done |
| [ENG-4](tickets/ENG-4.md) | P1 | Engine | Open swap: a picked card that was matched away | open |
| [SRV-1](tickets/SRV-1.md) | P1 | Server | An offline player stalls the game | open |
| [SRV-2](tickets/SRV-2.md) | P2 | Server | Server integration test | done |
| [BOT-1](tickets/BOT-1.md) | P2 | Bots | Bots match opponent cards | done |
| [WEB-1](tickets/WEB-1.md) | P1 | Web client | Highlight the peeked slot for everyone | open |
| [WEB-2](tickets/WEB-2.md) | P2 | Web client | Layout for 3–6 players on a phone | open |
| [WEB-3](tickets/WEB-3.md) | P2 | Web client | Sounds | open |
| [WEB-4](tickets/WEB-4.md) | P2 | Web client | Animation gaps | open |
| [WEB-5](tickets/WEB-5.md) | P2 | Web client | Table mood from the 3D render | open |
| [WEB-6](tickets/WEB-6.md) | P1 | Web client | Draw from an empty stack | open |
| [INF-1](tickets/INF-1.md) | P1 | Infra | CI on pull requests | open |
| [INF-2](tickets/INF-2.md) | P1 | Infra | Deploy | open |
| [MODE-1](tickets/MODE-1.md) | P3 | Game modes & options (later) | Multi-round games | open |
| [MODE-2](tickets/MODE-2.md) | P3 | Game modes & options (later) | Custom deck | open |
| [MODE-3](tickets/MODE-3.md) | P3 | Game modes & options (later) | House rule: wrong swish-swish penalty | open |

## Order

1. [ENG-1](tickets/ENG-1.md) (P0, small).
2. [INF-1](tickets/INF-1.md), then [ENG-2](tickets/ENG-2.md), [ENG-3](tickets/ENG-3.md) + [WEB-1](tickets/WEB-1.md), [SRV-1](tickets/SRV-1.md), [INF-2](tickets/INF-2.md), [ENG-4](tickets/ENG-4.md), [WEB-6](tickets/WEB-6.md): first real online game with
   friends.
3. [WEB-2](tickets/WEB-2.md), [WEB-4](tickets/WEB-4.md), [BOT-1](tickets/BOT-1.md), [SRV-2](tickets/SRV-2.md), [WEB-3](tickets/WEB-3.md), [WEB-5](tickets/WEB-5.md).
4. [MODE-1](tickets/MODE-1.md) first of the later options (it is how the group already plays), then [MODE-2](tickets/MODE-2.md) and [MODE-3](tickets/MODE-3.md).

Not planned: accounts, persistence/Redis (only for multi-instance or crash recovery), 3D table.

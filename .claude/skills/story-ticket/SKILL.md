---
name: story-ticket
description: Create a new ticket (user story + description, as-is, to-be, detailed acceptance criteria) when the user asks for a bug, refactor, or feature. Use whenever someone says "add a user story", "write a ticket", "create a story for this bug/refactor/feature", or describes work that should be captured as a ticket.
---

# Create a new ticket

When the user asks to capture a **bug**, **refactor**, or **feature**, produce two linked pieces:

1. A detailed **ticket** file in `tickets/`, carrying its own **user story** plus description,
   as-is, to-be, and detailed acceptance criteria.
2. One **row** in the ticket table of `PLAN.md`, linking to the ticket.

**Never assume which areas or prefixes exist; they change.** Read `PLAN.md` and list `tickets/`
at runtime and mirror what you find, but always create both pieces.

## Step 1 — Resolve the area, and with it the prefix

**This is the first and most important question. Do not guess.** Tickets are named by an
**area prefix** (e.g. `ENG`, `SRV`, `WEB`), and a prefix maps to exactly one area (the `Area`
column of the `PLAN.md` table). Derive it, don't recite it:

1. Read the ticket table in `PLAN.md` to see the areas and prefixes in use right now.
2. Determine the story's area from what it touches: `packages/engine` (rules, view, bot),
   `apps/server`, `apps/web`, CI/deploy, or a later game option.
3. **Reuse the existing prefix** for that area.
4. **If it fits no existing area**, ask the user (via `AskUserQuestion`) which area it belongs
   to, presenting the areas you found. Only if they confirm it's genuinely new: mint a short
   prefix (2–4 uppercase letters, unambiguous against existing ones).

Then find the **highest existing number for that prefix** in `tickets/` and use the next one.
Filename: `tickets/<PREFIX>-<N>.md` (no zero padding, matching the existing files).

Also confirm the **type** if ambiguous: `Bug fix`, `Refactor`, or `Feature`, and the
**priority** (definitions at the top of `PLAN.md`: P0 code contradicts a rule decision, P1
needed to play online with friends, P2 polish, P3 later options).

## Step 2 — Open a neighbour for formatting

Open an existing ticket of the same area in `tickets/` to see the header line and tone, and
mirror it. Older tickets may predate this skill and lack the sections below; new tickets always
get all of them.

## Step 3 — Write the ticket

```markdown
# <PREFIX>-<N> · <Title>

**Priority:** <P0–P3> · **Area:** <Area> · **Type:** <Bug fix | Refactor | Feature>

## User story

As a <player / host / developer>, I want <capability>, so <benefit>.

## Description

<1–3 sentences: what this delivers and why, in plain language.>

## Current situation (as-is)

- <How it works today. Link real files with clickable relative paths (`../packages/...`). For
  bugs, pinpoint the root cause.>

## Desired result (to-be)

- <The target behaviour after this ticket lands.>

## Acceptance criteria

- [ ] <Specific, testable outcome.>
- [ ] <Engine tests cover: … (name the cases).>
- [ ] <`npm run check` passes.>
- [ ] <Verified live in the browser: … (for UI changes).>

## Notes

- <Edge cases, design trade-offs, related tickets ("needs ENG-3"), or scope caveats.>
```

Writing rules:

- **User story** is the classic `As a <role>, I want <capability>, so <benefit>` line.
- **As-is** must reference actual code with clickable relative links and, for bugs, name the
  exact root cause (function, condition, wrong comparison). Grep the codebase to find the real
  files; don't invent paths.
- **Acceptance criteria** are checkboxes, each independently verifiable. Fold in the repo's
  hard rules where relevant (see `GAME_OVERVIEW.md` section 7):
  - A rule change updates the decision table in `GAME_OVERVIEW.md` section 5 and gets an engine
    test in `packages/engine/src/game.test.ts`.
  - Hidden information: `viewFor` never sends a hidden card's face; card ids stay random and
    opaque, re-issued on reshuffle. Anything touching views gets a "no hidden face" test.
  - The engine stays a pure reducer; randomness only through `Ctx`.
  - The server validates every incoming message (trust boundary); the client holds no game
    logic.
  - New protocol messages are typed in `packages/engine/src/protocol.ts`.
  - UI changes get a live browser check (two tabs = two players).
- Match the concise, traceable style of the existing tickets; no filler.

## Step 4 — Add the ticket to `PLAN.md`

Append one row to the ticket table, after the last row of the same area:

`| [<PREFIX>-<N>](tickets/<PREFIX>-<N>.md) | <Priority> | <Area> | <Title> | open |`

If the table has no `Status` column yet, add it (every existing row `open`, unless its ticket
says otherwise). **Dependencies go in the ticket's Notes, not in the table.** If the ticket
changes what should be worked next, adjust the `## Order` list in `PLAN.md` too.

## Step 5 — Report back

Tell the user the **area**, **priority**, and link the new ticket file and `PLAN.md`. Do not run
type check or tests; these are docs, not code.

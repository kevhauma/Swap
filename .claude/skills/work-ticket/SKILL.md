---
name: work-ticket
description: Work a ticket end-to-end — read it, plan the implementation, build it, tick each acceptance criterion as it verifiably passes, then mark the ticket done in PLAN.md. Use whenever someone says "work on a ticket", "start ticket ENG-1", "implement this ticket", "pick up WEB-2", or points you at a ticket file to build.
---

# Work a ticket to done

Drive one ticket from "open" to "done". The ticket is the source of truth: its **Acceptance
criteria** are the contract, and once every criterion passes its row in the `PLAN.md` ticket
table is marked `done`.

Tickets live in `tickets/<PREFIX>-<N>.md`; `PLAN.md` is the index (table with priority, area,
status) plus the suggested `## Order`. The rules the game implements are in `GAME_OVERVIEW.md`
(section 5 is the decision table). **Discover the current layout at runtime; don't hardcode a
ticket list.**

## Running mode — in-session or delegated

You can work the ticket yourself, or hand it to the **`ticket-worker`** subagent
(`.claude/agents/ticket-worker.md`), which runs this same skill in its own context and reports
back a short summary. Delegate when the user wants **several tickets in a row**; work it inline
for a single ticket, or when the user wants to review the plan and steer as you build.

When delegating:

- **One `ticket-worker` at a time. Never two in parallel**: they share one working tree, so two
  runs would interleave edits, mix up `git diff`, and race the same check commands.
- Do Step 1 (locate the ticket) yourself and pass everything the agent can't ask about: which
  ticket, and whether you will run the live browser check. E.g.
  `Work ENG-1 (tickets/ENG-1.md). Browser check: the orchestrator will run it.`
- The agent leaves every "Verified live in the browser: …" criterion open; **you** run those
  when it returns (ask the user first), then tick them with the evidence.
- Relay the agent's report to the user; its output isn't shown to them. Summarize per ticket:
  status, what changed, unticked criteria and why, verification result.
- The agent never commits. Committing stays with you, and only when the user asks.

## Step 1 — Locate the ticket

- **If the user named a ticket** (ID like `ENG-1` or a path), open `tickets/<ID>.md`.
- **If no ticket was named**, read the `PLAN.md` table for rows that are not `done`, follow the
  `## Order` list and priorities, check each candidate's Notes for an unmet dependency, and ask
  via `AskUserQuestion` which one to work. Present the real open tickets you found.

## Step 2 — Read and orient

Read the **whole** ticket: user story, description, as-is (follow its file links to the real
code), to-be, acceptance criteria, notes. If it changes a rule, read the matching rows of
`GAME_OVERVIEW.md` section 5.

**Older tickets may have no `## Acceptance criteria` section** (just text and a "Done when"
line). Then derive checkbox criteria from the ticket text, add them to the ticket as
`## Acceptance criteria`, and include them in the plan for approval. Add `- [ ] npm run check
passes.` and, for UI work, a `Verified live in the browser: …` criterion.

**Restate the ticket's intent in one or two sentences** so the user can confirm you understood
it.

## Step 3 — Plan, then pause for approval

Produce a concrete plan **mapped to the acceptance criteria**: which files change in
`packages/engine`, `apps/server`, `apps/web`, which tests get added (name the cases), which UI
is touched. Respect the hard rules (`GAME_OVERVIEW.md` section 7):

- The server is authoritative; `viewFor` never sends a hidden card's face to a player who may
  not see it. Peeks go out as one-off `reveal` messages, never stored in a view.
- Card ids are random and opaque, never derived from the value; re-issued on reshuffle. Actions
  name cards by id, not slot index.
- The engine is a pure reducer (`apply(state, playerId, action, ctx)`); randomness and ids only
  through `Ctx`. Rule violations throw `RuleError`.
- Every incoming WebSocket message is validated on the server; the client holds no game logic.
- Shared message types live in `packages/engine/src/protocol.ts`.
- A rule change updates the decision table in `GAME_OVERVIEW.md` section 5 in the same change.
- No new dependency for a few lines of code.

Track the steps with a todo list. **Present the plan and wait for the user's go-ahead before
editing any code.**

## Step 4 — Implement

Work the plan criterion by criterion. Keep changes scoped to this ticket; if you spot
out-of-scope work, note it (or suggest a new ticket via the `story-ticket` skill) rather than
doing it.

**If the implementation diverges from an acceptance criterion, record the divergence at the
moment you pivot**: amend the criterion in the same change, striking through the superseded
wording or adding a dated note. A ticket whose boxes describe code that doesn't exist is worse
than one with open boxes.

## Step 5 — Verify, then tick each criterion

A criterion gets ticked **only when it verifiably passes**, never on hope.

1. Run `npm run check` (type check + engine tests) from the repo root. Fix failures before
   ticking anything.
2. For any criterion phrased **"Verified live in the browser: …"**, run `npm run dev` (server
   on :3001, web on http://localhost:5173), open two tabs (or add bots) and reproduce the
   scenario. Capture proof (screenshot or observed behaviour).
3. For each satisfied criterion, edit the **ticket file**: `- [ ]` → `- [x]` **and append the
   evidence in parentheses** (the file, test name, or observed behaviour). A tick with no
   evidence is not a tick.
4. Do **not** tick a criterion that fails or that you couldn't verify. If one was deliberately
   skipped (the user waived the browser check, say), leave it `- [ ]` and append **why**.
5. **Final AC↔diff pass.** Re-read every `- [x]` against the working tree (`git diff`, the
   file, the passing test). Any box whose evidence you can't point at right now gets unticked.

## Step 6 — Mark the ticket done (only when ALL criteria are `[x]`)

In the `PLAN.md` ticket table, find the row whose link matches this ticket ID (**match on the
link, not the title**) and set its `Status` to `done`. If the table has no `Status` column yet,
add it (`open` for every other row). If the ticket settled or changed a rule, check
`GAME_OVERVIEW.md` section 5 says so; if it changed setup or commands, update `README.md`.

## Step 7 — Report and stop

Summarize what changed, link the ticket and `PLAN.md`, and show the verification proof (check
output + any browser evidence). **Leave the working tree for the user to review; do not commit**
unless they ask.

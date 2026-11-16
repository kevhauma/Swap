# INF-1 · CI on pull requests

**Priority:** P1 · **Area:** Infra · **Type:** Feature

## User story

As a developer, I want type check and tests to run on every pull request, so a broken rule never
reaches `main`.

## Description

Add one GitHub Actions workflow that runs `npm run check` on Node 24.

## Current situation (as-is)

- No `.github/` folder; checks only run when someone runs `npm run check` locally.
- [package.json](../package.json): `check` = `tsc && vitest run`, engines `node >= 24`.

## Desired result (to-be)

- Every pull request and every push to `main` runs `npm ci` and `npm run check`.

## Acceptance criteria

- [x] `.github/workflows/check.yml` runs on `pull_request` and on `push` to `main`.
      (`.github/workflows/check.yml`, `on: pull_request` + `push: branches: [main]`)
- [x] Uses `actions/setup-node` with Node 24 and the npm cache, then `npm ci` and
      `npm run check`. (`actions/setup-node@v4`, `node-version: 24`, `cache: npm`; lockfile has
      Linux native bindings and every engine range accepts Node 24; `npm ci --dry-run` and
      `npm run check` pass locally)
- [x] Actions pinned to a version; no secrets needed. (`actions/checkout@v4`,
      `actions/setup-node@v4`; no `secrets.*` used, `permissions: contents: read`)
- [ ] A pull request shows the check passing on GitHub. — not ticked: pending: needs a pushed PR

## Notes

- Independent. Do it before the other P1 tickets so they get checked.

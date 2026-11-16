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

- [ ] `.github/workflows/check.yml` runs on `pull_request` and on `push` to `main`.
- [ ] Uses `actions/setup-node` with Node 24 and the npm cache, then `npm ci` and
      `npm run check`.
- [ ] Actions pinned to a version; no secrets needed.
- [ ] A pull request shows the check passing on GitHub.

## Notes

- Independent. Do it before the other P1 tickets so they get checked.

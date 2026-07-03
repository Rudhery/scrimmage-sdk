# Contributing to Scrimmage SDK

Thanks for taking the time to contribute. This repository contains the public SDK packages used by
Scrimmage, so changes here should stay framework-agnostic and safe to consume outside the Discord
bot.

## Code of Conduct

This project follows a [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected
to uphold it. Please report unacceptable behavior to the maintainers.

## Getting Started

1. Fork the repository and clone your fork.
2. Make sure you're on Node.js 20 or newer.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Create a branch for your work:

   ```bash
   git checkout -b feat/short-description
   ```

## Project Layout

This is an npm workspaces monorepo:

| Path                      | Package                     | Purpose                                                                       |
| ------------------------- | --------------------------- | ----------------------------------------------------------------------------- |
| `packages/core`           | `@scrimmage/core`           | Domain models, services, repository interfaces, validation, and typed events. |
| `packages/storage-sqlite` | `@scrimmage/storage-sqlite` | SQLite adapter powered by Drizzle ORM and `better-sqlite3`.                   |

Business rules belong in `@scrimmage/core`. Database-specific behavior belongs in storage adapter
packages. The core package must not import Discord, SQLite, web frameworks, or deployment-specific
code.

## Useful Scripts

Run these from the repository root:

| Script                 | What it does                                                  |
| ---------------------- | ------------------------------------------------------------- |
| `npm run build`        | Build every package.                                          |
| `npm run typecheck`    | Type-check the SDK.                                           |
| `npm run lint`         | Lint source files.                                            |
| `npm run format`       | Format with Prettier.                                         |
| `npm run format:check` | Check formatting in CI.                                       |
| `npm test`             | Run the Vitest suite.                                         |
| `npm run db:generate`  | Generate SQLite migrations from the Drizzle schema.           |
| `npm run brand:banner` | Regenerate the README banner from `brand/source/banner.html`. |

## Before You Open a Pull Request

Please make sure the following all pass locally:

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/). A few examples:

- `feat(core): add standings tiebreaker`
- `fix(storage-sqlite): preserve poll vote order`
- `docs: clarify repository adapter requirements`

## Changesets

If your change affects a published package (`@scrimmage/core` or `@scrimmage/storage-sqlite`), add
a changeset so it gets versioned and shows up in the changelog:

```bash
npm run changeset
```

Commit the generated file in `.changeset/` alongside your code. Changes that only touch docs,
templates, CI, or repo metadata usually do not need a changeset.

## Reporting Bugs and Requesting Features

Use the [issue templates](https://github.com/getscrimmage/scrimmage-sdk/issues/new/choose). The more
detail you give, the faster we can reproduce, evaluate, and fix the issue.

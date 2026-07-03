<div align="center">

<img src="brand/scrimmage-banner-sdk.png" alt="Scrimmage SDK" width="860" />

### Build scrimmage scheduling, standings, polls, RSVPs and brackets into your own app.

[![CI](https://github.com/Rudhery/scrimmage-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/Rudhery/scrimmage-sdk/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-d3ff33.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-d3ff33.svg)](https://nodejs.org)
[![Packages](https://img.shields.io/badge/packages-core%20%2B%20sqlite-1a1d24.svg)](#packages)
[![Contributing](https://img.shields.io/badge/contributions-welcome-d3ff33.svg)](./CONTRIBUTING.md)
[![Security](https://img.shields.io/badge/security-policy-1a1d24.svg)](./SECURITY.md)

</div>

**Scrimmage SDK** is the reusable TypeScript core behind Scrimmage: domain models, typed events,
services, repository interfaces, and a SQLite storage adapter. It is framework-agnostic, so you can
use the match logic without Discord, a bot process, or the Scrimmage dashboard.

This public repository intentionally contains only the SDK packages. The complete Discord bot,
dashboard, API server, deployment setup, and private application code live outside this repo.

## What you get

|                     |                                                                                   |
| ------------------- | --------------------------------------------------------------------------------- |
| **Teams & rosters** | Create teams, manage captains and members, and enforce one-team membership rules. |
| **Scrimmages**      | Propose, confirm, cancel, remind, and record match results.                       |
| **Standings**       | Compute league tables from recorded scrimmage results.                            |
| **Stats & awards**  | Track player stat categories, MVP scoring, and per-match awards.                  |
| **Polls & RSVP**    | Model availability polls and attendance responses.                                |
| **Championships**   | Generate and score single-elimination brackets.                                   |
| **Typed events**    | Subscribe to domain events without coupling your app to Discord or SQLite.        |

## Packages

| Package                     | Description                                                                   |
| --------------------------- | ----------------------------------------------------------------------------- |
| `@scrimmage/core`           | Domain models, repository interfaces, typed events, validation, and services. |
| `@scrimmage/storage-sqlite` | SQLite storage adapter powered by Drizzle ORM and `better-sqlite3`.           |

## Install

After the packages are published to npm:

```bash
npm install @scrimmage/core @scrimmage/storage-sqlite
```

Until npm publication, clone the repository and use it as a workspace dependency:

```bash
git clone https://github.com/Rudhery/scrimmage-sdk.git
cd scrimmage-sdk
npm install
npm run build
```

## Quick Start

```ts
import { ScrimmageService, TeamService, TypedEventBus } from '@scrimmage/core';
import { createSqliteStorage } from '@scrimmage/storage-sqlite';

const storage = createSqliteStorage({ path: './scrimmage.sqlite', migrate: true });
const events = new TypedEventBus();

events.on('scrimmage.confirmed', ({ scrimmage }) => {
  console.log(`Scrimmage ${scrimmage.id} is confirmed`);
});

const teams = new TeamService(storage.teams, { events });
const scrimmages = new ScrimmageService(storage.scrimmages, storage.teams, { events });

const home = await teams.createTeam({
  guildId: 'guild-1',
  name: 'Red Dragons',
  tag: 'RDG',
  captainId: 'user-1',
});
```

The core package only depends on interfaces it defines itself. If SQLite is not the right fit, you
can implement `TeamRepository`, `ScrimmageRepository`, and the other storage contracts for your own
database.

## Development

```bash
npm install
npm test
npm run typecheck
npm run build
```

## Repository Shape

```text
scrimmage-sdk/
├── packages/
│   ├── core/                  # @scrimmage/core
│   └── storage-sqlite/        # @scrimmage/storage-sqlite
├── brand/                     # SDK README artwork
├── .github/                   # CI, release, issue and PR automation
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
└── SECURITY.md
```

## Community

Issues and pull requests are welcome. Please read the
[contribution guide](./CONTRIBUTING.md), follow the [code of conduct](./CODE_OF_CONDUCT.md), and
report security issues through the [security policy](./SECURITY.md).

## Publishing

The workspace is configured for public npm packages:

```bash
npm login
npm publish --workspace @scrimmage/core --access public
npm publish --workspace @scrimmage/storage-sqlite --access public
```

## License

MIT

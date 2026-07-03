# Scrimmage SDK

Framework-agnostic TypeScript packages for building scrimmage scheduling, team management,
standings, polls, RSVPs, player stats, and championship brackets.

This repository contains the reusable SDK extracted from Scrimmage. It does not include the
Discord bot, web dashboard, API server, deployment configuration, or private application code.

## Packages

| Package | Description |
| --- | --- |
| `@scrimmage/core` | Domain models, repository interfaces, typed events, and services. |
| `@scrimmage/storage-sqlite` | SQLite storage adapter powered by Drizzle ORM and `better-sqlite3`. |

## Install

After the packages are published to npm:

```bash
npm install @scrimmage/core @scrimmage/storage-sqlite
```

Until npm publication, clone the SDK repository and use it as a workspace dependency:

```bash
git clone https://github.com/Rudhery/scrimmage-sdk.git
cd scrimmage-sdk
npm install
npm run build
```

## Usage

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

## Development

```bash
npm install
npm test
npm run typecheck
npm run build
```

## Publishing

The workspace is configured for public npm packages:

```bash
npm login
npm publish --workspace @scrimmage/core --access public
npm publish --workspace @scrimmage/storage-sqlite --access public
```

## License

MIT

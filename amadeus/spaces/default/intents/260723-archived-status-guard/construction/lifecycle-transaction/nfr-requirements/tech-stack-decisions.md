# Tech Stack Decisions — lifecycle-transaction

`business-logic-model`、`business-rules`、`requirements`、`technology-stack`に基づき既存stackを継続する。

## Selections

- TypeScript 6 / Bun / ESM。
- 既存workspace lock、atomic writer、audit parser/emitter、UUID、filesystem API。
- internal ports + test-side failing fakes。
- `bun run typecheck`、Biome、`bun test`、dist/self-install drift guards。

## Rejected additions

database transaction engine、external lock service、telemetry SDK、test-only production flags、新runtime dependencyは追加しない。

CIは既存check jobで`bun install --frozen-lockfile`後、developer/CI共通の`bun run typecheck`を実行する。このscriptは`tsc --noEmit -p tsconfig.json`と`tsc --noEmit -p tsconfig.tests.json`を順に実行する。RE時のexit 127は依存未install環境の観測であり、bootstrap済みrelease gateとは分離する。続いて既存lint/test/drift commandを実行する。

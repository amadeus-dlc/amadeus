# Tech Stack Decisions — status-registry

`business-logic-model`、`business-rules`、`requirements` とreverse-engineered `technology-stack`を根拠に、既存stackを継続する。

## Selected stack

| Concern | Selection | Rationale |
|---|---|---|
| Language/runtime | TypeScript 6 / Bun | 既存framework coreと一致 |
| Module style | ESM | 既存tools境界を維持 |
| Persistence | JSON file + existing atomic writer | 新規database不要、byte contractを検証可能 |
| Validation | class-free type + companion parser | projectのParse, Don't Validate規約 |
| Tests | `bun test`、unit/integration/corpus/benchmark | 既存test runnerを再利用 |
| Lint/type | Biome、`bun run typecheck` | lockfileのTypeScript 6.0.3で両tsconfigを検査 |
| Distribution | core→6 harness→self-install generation | NFR-04 drift guard |

## Rejected additions

- schema validation library: 4値statusと既存entry shapeには新runtime dependencyが過剰。
- database/transaction engine: 単一local fileとone-shot migrationに不要。
- monitoring/telemetry SDK: 常駐serviceがなく、要求外の外部送信面を作る。
- backup framework: version controlとatomic old/new contractで十分。
- compatibility shim: `closed`をruntimeへ残しFR-01に反する。

## Verification

CIは既存check jobで`bun install --frozen-lockfile`を先に実行し、`node_modules/.bin/tsc`を利用可能にした後に`bun run typecheck`（`tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.tests.json`）を実行する。developer環境も依存install後に同じcommandを使う。RE時のexit 127は依存未install環境の観測であり、bootstrap済みCIのrelease gateとは分離する。

package manifestとlockfileに新runtime dependencyが0件、coreとgenerated treesのdrift 0、`bun run typecheck`、`bun run lint:check`、`bun run test:ci`がgreenであることをrelease条件とする。benchmarkは既存test:ciへ登録し、version bumpや新CI jobは本Unitで行わない。

# Tech Stack Decisions — ts-arm

## Constraints

`business-logic-model.md` のTypeScript pure checker、`business-rules.md` のclosed universe / PBT、`requirements.md` のblind comparison、`technology-stack.md` のcurrent stackを維持する。新しいsolver、database、serviceを追加しない。

## Selected stack

| Concern | Selection | Rationale |
| --- | --- | --- |
| Runtime / language | Bun 1.3.13 / TypeScript ESM | current repository / typed union |
| Exhaustive checker | pure TypeScript generators / predicates | closed 5,760 + 160 universeを決定的列挙 |
| Property tests | fast-check 4.9.0 | seed/path付き100 invariant runs |
| Identity | `node:crypto` SHA-256 | universe / arbitrary / resultをcontent-address |
| Process | U3 network-denied array-argv adapter | timeout / output / evidence境界を共通化 |
| Tests | `bun:test` | oracle / universe / replayを既存stackで検査 |

## Runtime freeze

Bun distribution、package.json / bun.lock、fast-check package tree、source / test / arbitrary manifestsはone-time preparationで全量hashする。preparation上限は50,000 regular files / 2 GiB / 120秒で、suite timer外のraw costとして記録し、成功時に`ImmutableTsRuntimeReceipt`をmintする。以後OS filesystem sandboxでallowlist treeをread-onlyに固定し、各runはreceipt / root identity / clean snapshotを照合して全量rehashをtimer内で繰り返さない。read-only enforcement不能ならfail-closedにする。PBT seed=20260720、numRuns=100、workers=1をliteralにする。

## Rejected additions and checks

TLA output reuse、Alloy / SMT、dynamic plugin、parallel PBT、network dependency、shell executionを追加しない。typecheck / Biome / bun test / package check、forbidden-path scan、lockfile / package tree rehashを実行する。

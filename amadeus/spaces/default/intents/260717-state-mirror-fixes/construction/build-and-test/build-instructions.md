# Build Instructions — 260717-state-mirror-fixes

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(両 unit — fix-1170-retreat-guard / fix-1172-skip-denominator)

## ビルド手順(両 Bolt 共通 — Bun 直接実行のためコンパイル工程なし)

| 手順 | コマンド | 対象 |
|---|---|---|
| 型検査 | `bun run typecheck` | 全体(tsc --noEmit) |
| lint | `bun run lint` | Biome |
| 配布再生成(U1 のみ) | `bun scripts/package.ts` + `bun run promote:self` | dist 6ツリー+self-install(code-generation-plan.md fix-1170 手順5) |
| drift 検査 | `bun run dist:check` + `bun run promote:self:check` | 正本↔生成物一致 |

## 適用範囲

U2 は scripts ローカルのため配布工程なし(code-summary.md fix-1172)。ビルド成果物は存在せず、検査はすべて正本+生成物の drift 検査で完結する。

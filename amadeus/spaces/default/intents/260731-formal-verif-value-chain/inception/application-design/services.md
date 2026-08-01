# Services — formal-verif-value-chain

上流入力(consumes 全数): requirements, architecture, component-inventory

本 intent はアプリケーションサービス(常駐プロセス)を持たない。利用者可視の「サービス面」= CLI verb と CI ジョブの契約を列挙する(requirements FR 対応、既存面の実測は architecture.md 260731 節)。

## CLI 面

| Verb | 変更 | FR |
|---|---|---|
| `bun .claude/tools/amadeus-plugin.ts compose [--if-stale] [--project-root <dir>]`(plugin 名の positional なし — staging 内 plugin 群が対象) | 不変(tools 配布が加わる — manifest 宣言駆動) | FR-A3 |
| `compose --all-harnesses`(FD u4 で確定 2026-07-31 — 既存 verb への明示フラグ、新 verb なし。対象 hostRoot 集合を検出済み全ハーネスへ拡大) | 新設 — 現存全ハーネスツリーへ順次 compose、fail-closed 集計 | FR-B1 |
| `bun .claude/tools/amadeus-orchestrate.ts next` | directive JSON へ advisories フィールド追加(空時省略)、発火点3点+ラッチ | FR-B2/B3 |
| `bun .claude/tools/amadeus-sensor-model-completeness.ts updateModelMap` | 不変(MODEL_UNCHANGED detail に正規手順追記) | FR-D2 |
| 同 `updateModelMap --impl-only` | 新設 — impl-hash-only refresh、宣言必須+監査行 | FR-D1 |
| `bun plugins/formal-model-check/tools/run-model-check.ts` | パス移設(旧 scripts/formal-verif/ は消滅) | FR-A1 |

## CI ジョブ面

- `formal-model-check`(ci.yml、workflow_dispatch): 消費パスを plugin tools へ付け替え。run→verify→evidence upload→exit 分岐の意味論不変(FR-A4)。
- 日常 CI(push/pull_request): t377 境界ガード等の新設テストが既存プロファイルに乗る。新設ジョブなし(NFR-1)。

## 配布面

- `dist/plugins/formal-model-check/*`(7 ハーネス+中立): projection は全ファイル走査のため tools/ 追加で自動的に投影される(機構変更不要 — 実測 scripts/plugin-projection.ts:158)。stage 本文の参照書き換えが全変種へ伝播(FR-A2)。
- 配布先 host: compose 後に `plugins/formal-model-check/{stages,tools}/` が揃い、stage 指示コマンドが自立解決する(FR-A3 AC)。

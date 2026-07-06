# Build & Test Results — 260704-engine-namespace

実行日: 2026-07-05
実行環境: build workspace（`claude/issue-445-engine-namespace` branch、未コミット working tree）
実行手順は build-instructions.md と unit-test-instructions.md に従った。
対象の実装内容は `../implicit/code-generation/code-summary.md`、計画と Review は `../implicit/code-generation/code-generation-plan.md` を参照する。

## ビルド結果

| コマンド | 結果 |
|---|---|
| `npm run typecheck` | pass（`test:all` 連鎖内で実行、改名後の import 連鎖が全解決） |
| `npm run lint:check` | pass（同上、違反 0） |

## テスト結果

`npm run test:all`（= `test:ci:mock` 連鎖）を本ステージで新規に完走し、**exit code 0（PASS）** を確認した。

| 連鎖内の検証 | 結果 |
|---|---|
| `typecheck` / `lint:check` / `contracts:check` | pass |
| `parity:check` | pass（38 skills、197 engine files、`nameMappings` 57 行、`engineFileExceptions` 空のまま） |
| `claude-wiring:check` / `grilling-wiring:check` | pass（張り替え後の symlink と結線） |
| `test:it:all`（`test:it:parity`、`test:it:promote-skill` を含む） | pass |
| `test:it:engine-e2e` | pass（改名後エンジンのコピーで sandbox e2e 全項目 ok） |
| `diff:check` | pass |

失敗・スキップは 0 件である。

## N005 残存 grep（本ステージで新規実行）

要求どおり、対応表由来のパターン（tools/hooks の `.ts`/`.js`、scopes/sensors の `.md`、`.agents/aidlc/`、`aidlc-common`、`aidlc-shared`、`rules/aidlc.md`）を、許容例外 5 箇所（`aidlc/spaces/**`、`parity-baseline.json`、`dev-scripts/evals/parity/**`、`parity-map.json`、`generate-parity-baseline.ts`）を除外して grep した結果、**0 件**である。

## 構造検証

`AmadeusValidator`（workspace 全体）: pass。

## TDD 証跡（code-generation ステージからの通算）

- RED 1: `nameMappings` fixture が一般化前の実装で fail（5 件）→ GREEN 1: 対応表駆動化後に pass。
- RED 2: tool 間 ESM import の `.js` 拡張子参照を `test:all` が検出（parity・engine-e2e fail）→ GREEN 2: `.ts`/`.js` 両対応 + 回帰 fixture で pass。
- RED 3: scope-file/sensor-file kind の regex を一時無効化して fail（3 件）を確認 → GREEN 3: 復元して pass（reviewer 指摘対応ラウンド）。

## 実運用確認（dogfooding）

本 Intent 自身のワークフロー遷移（gate commit、stage 遷移、audit 追記）を、改名後の `amadeus-orchestrate.ts` / `amadeus-state.ts` / hooks で正常に実行できた。

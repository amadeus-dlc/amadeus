# 収束レポート — election-legacy-migration

## 判定

**READY（local U6 implementation scope）**。既存 migration CLI の plan-bound apply を維持したまま、新多問 corpus の fidelity、CLI `--verify` の write-free、fail-closed JSON/state parse、unchecked-cast allowlist の shrink を閉じた。U6 所有テスト、typecheck、lint、source-only、t420 は成功した。

リモート review thread、mergeability、必須 check rollup は本 directive の対象外であり、外部状態の照会・更新は行っていない。このレポートは local U6 code-generation の検証断面だけを示す。

## 観測断面

- observed at: `2026-08-14T06:28:37Z`
- HEAD: `4d527a4fd84eb523cd23cbe1783cbb4d839af79e`
- branch: `enhancement-election-cli-cli-per-question-choice`
- scope: `self-feature`（Amadeus self-development の機能拡張）

## 実行証拠

| Command | Result |
|---|---|
| `bun test --timeout 120000` t262 unit + t262 integration + t556 | exit 0、15 pass / 0 fail / 71 expect calls |
| `bunx @biomejs/biome check`（U6 source/test 4 files） | exit 0、diagnostic なし |
| `bun run typecheck` | exit 0 |
| `bun tests/unchecked-cast-guard.ts --check`（allowlist 更新後） | exit 0、新規 cast 0、残 31 |
| `bun test --timeout 120000 tests/integration/t420-unchecked-cast-guard-cli.test.ts` | exit 0、19 pass / 0 fail。committed ledger は live census と byte-identical |
| `bun run source-only:check` | exit 0、source-only boundary clean |
| `git diff --check`（U6 所有ファイル） | exit 0 |

## 収束対象

- Contract gap: FR-COMP-4 の新多問 corpus fidelity と CLI `--verify` の write-free / 改変拒否が回帰として欠けていた。
- Fix: `t556` に v2 多問の digest/question ID 一致と改変 fail-closed を追加。`t262` に verify/approval/altered-plan を追加。
- Guard gap: CLI `JSON.parse(...) as T` と不要な `as ElectionState`。
- Fix: unknown + predicate。`ElectionV2State` は `ElectionState` へ widening 可能。allowlist から当該ファイルを削除（33 → 31）。
- Change isolation: migrate script 1、既存 U6 tests 2、allowlist 1、宣言済み stage artifacts。Intent state と commit は変更していない。

## 未収束面

- repository-wide `bun run test:ci` は本 unit では実行していない。U3 が記録した team-up lifecycle 失敗などは U6 所有外として残る。
- coverage gates、隔離2回 reproducible-build、TLC/model-map、外部 repository hosting の review/check 状態は本 U6 code-generation directive では個別実行・照会していない。

## Blocker

なし。

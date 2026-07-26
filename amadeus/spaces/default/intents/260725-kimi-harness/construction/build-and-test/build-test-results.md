上流入力(consumes 全数): code-generation-plan, code-summary

# Build Test Results — 260725-kimi-harness

> 実行日時: 2026-07-26T08:10-08:25Z。全コマンドは worktree `wt/20260725` で実行。

## ビルド結果

| コマンド | 結果 |
|---|---|
| `bun run typecheck` | PASS(exit 0) |
| `bun run lint` | PASS(exit 0) |
| `bun run dist:check` | PASS(exit 0) |
| `bun run promote:self:check` | PASS(exit 0) |
| `bun scripts/package.ts kimi --check` | PASS(exit 0) |

## フル CI ベースライン(`bash tests/run-tests.sh --ci` = smoke + unit + integration)

| 実行 | 結果 |
|---|---|
| 初回(2026-07-26T08:01Z) | FAIL: 528 ファイル・7347 断言・**3 ファイル 4 断言失敗** |
| 修正後(2026-07-26T08:18Z) | FAIL: **1 ファイル 1 断言失敗**(下記の既存フレーク) |

### 初回の3失敗(全て本変更由来 → 修正済み)

| 失敗 | 原因 | 修正 |
|---|---|---|
| `t-test-size-drift.test.ts` | `tests/unit/t-kimi-print-drive.test.ts` が medium(unit は small 上限) | integration 層へ移動(git mv + `// size: medium` 注記。B3 先例どおり) |
| `t181-conductor-skill-parity.test.ts` | shipped conductor SKILL の expected set が4ツリーで kimi 未収録 | expected set に kimi を追加(5ツリーに現行化。ヘッダコメントも) |
| `t199-generated-prefix-contract.test.ts` | ルート `.kimi-code/tools/amadeus-migrate.ts` が foreign prefix の検査対象に | allowlist に `.kimi-code/tools/amadeus-migrate.ts` を追加(他 self-install ツリーと同じ扱い) |

- 修正後の個別再実行: 67 pass / 0 fail(3ファイル + 移動ファイル + size-dynamic ゲート)

### 残存する1失敗(既存フレーク・本変更と無関係)

- `tests/integration/t-team-up-codex-resume.serial.test.ts` > `team-up run lifecycle > a safety-wait launch failure cleans every started supervisor`
- **切り分け**: 単独再実行で 54 pass / 0 fail(74.81s)。並列負荷下の watcher タイミング系フレーク(team-up watcher 領域は 260724-watcher-timeout-fix が最近触った領域で、project.md に同族の timing 学習が複数ある)。本変更(harness/setup/doctor/swarm)との交差なし
- **判定**: conditional readiness(build-and-test:c1-doctor-seam の既定 — 対象変更は green、既存の無関係な問題は隠さず別作業へ送る)。Issue 起票候補として記録(ゲートで判断)

## 関連スイートの累積(unit/integration で本変更に直接関係するもの)

| 領域 | 件数 | 結果 |
|---|---|---|
| B1 dist 構造 smoke + t145 parity | 2 + 17 | 0 fail |
| B2 adapter 契約 | 37 | 0 fail |
| B3 merge domain/module | 34 | 0 fail |
| B4 swarm resolve + doctor arm | 27 | 0 fail |
| B5 列挙 + cli 配線 + 22 スイート | 245 | 0 fail |
| B6 driver 単体 + live journey(実走) | 13 + 3 | 0 fail(実走 3 pass/79.88s) |
| live journey 決定的 tier | 3 skip | 意図どおり |

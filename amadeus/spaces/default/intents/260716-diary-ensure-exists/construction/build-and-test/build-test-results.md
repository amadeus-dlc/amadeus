# Build & Test Results — 260716-diary-ensure-exists

## 実行環境

bolt worktree(bolt/260716-diary-ensure-exists @ 54484a089)、2026-07-16T10:38-10:40Z の fresh 実行(evidence-discipline)。検証対象は `code-generation-plan.md` の変更目録と `code-summary.md` の AC 表。

## 実測結果

| コマンド | 結果 | exit |
|---------|------|------|
| `bun run typecheck` | PASS | 0 |
| `bun run lint` | PASS | 0 |
| `bun run dist:check` | PASS(dist×6 同期) | 0 |
| `bun run promote:self:check` | PASS(self-install ×2 同期) | 0 |
| 新設4テスト+t135(8)+registry(42) | 54 tests / 0 fail | 0 |
| `t100-memory-template-lifecycle` | 16 tests / 0 fail | 0 |
| `bash tests/run-tests.sh --smoke` | RESULT: PASS | 0 |
| `bash tests/run-tests.sh --ci`(フル) | RESULT: PASS(10:25Z) | 0 |

## 落ちる実証

上書き注入(`false && existsSync`)で never-overwrite/idempotent 2テスト FAIL → 復元+regen で 4 pass(conductor 10:02Z+stage reviewer 独立再実施)。

## dogfooding(AC-4d)

CG diary(10:15Z)と B&T diary(10:38Z)が実装自身により自動生成 — いずれもテンプレート cmp byte 一致。

## CI

PR #1088(head 54484a089): typecheck-lint-drift-tests **pass**(10:36Z Monitor 実測)。初回赤は自変更由来(t135 連結 parse)と実文帰属し是正済み。e2 増分再確認 READY(leader 経由 10:36:58Z)。

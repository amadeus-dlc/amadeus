# Integration Test Instructions — teamup-resume-size-drift(Issue #1081)

上流入力(consumes 全数): fix-1081-size-drift の code-generation-plan.md / code-summary.md。

## 対象と実行

- `bash tests/run-tests.sh --integration --filter t-team-up-codex-resume` — 対象テスト 37 pass+サマリの wall-clock drift 行に対象が現れないこと(0 file(s))。実測済み(conductor+reviewer)
- フルスイートでの drift 0 はフル coverage run でも確認済み(conductor)

## 前提条件

追加の手動セットアップ不要。フル coverage 併用時はホスト負荷の収束を待つ(t163 等の負荷敏感クラスの偽赤回避 — fanout-load-settle-before-integration)。

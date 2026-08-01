# Code Generation Plan — U1 perf-tier-and-migration

上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md(U1 FD)

## 実行計画(TDD 順序 — business-logic-model.md の写像)

1. Red: tests/unit/t-run-tests-perf-tier.test.ts を先行作成し失敗を実測(business-rules.md BR 群の受け入れ面)
2. Green: run-tests.ts へ perf tier 実装(domain-entities.md の型・定数変更)
3. 移設: C-2 表の6ファイル分割/whole 移設
4. coverage 整合: TEST_TIERS 追加 → registry regen → gate 3 面
5. 落ちる実証: 除外述語の probe 注入(非コミット)
6. 全検証コマンド exit 実測 → 検証レポート

## 実行形態

swarm(batch 1)worktree 分離、builder subagent 1名、branch bolt-perf-tier-and-migration。

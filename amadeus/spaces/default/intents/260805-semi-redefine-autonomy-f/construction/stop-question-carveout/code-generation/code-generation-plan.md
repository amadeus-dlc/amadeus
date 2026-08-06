# Code Generation Plan — `stop-question-carveout`(#2253、swarm batch 2 事後作成)

上流入力(consumes 全数): business-logic-model.md, business-rules.md, domain-entities.md, security-design.md, logical-components.md

swarm 経路のため本 plan は finalize 後の事後作成(`cid:code-generation:swarm-unit-artifact-backfill`)であり、実績 = builder report(隔離 worktree builder、最終 HEAD `24647a2df`)からの転記である。base は batch 1 の 3 bolt ブランチのマージ(`01c7d3eeb`)。

## 実装ステップ(実績)

1. **carve-out 開放**(`b787df05f`)— `packages/framework/core/hooks/amadeus-stop.ts` へ判定ヘルパー `isQuestionCarveoutIntent` を新設(:189)し、質問 carve-out の入口 1 箇所(:447、旧 :422)のみを full 限定から「人間宣言の semi Intent も対象」へ差し替え。他の消費点(:482 / :741)と cap・budget 経路は無改変(surgical)。
2. **テスト固定**(`6a67bbc96`)— `tests/integration/t456-stop-question-carveout.integration.test.ts`(fs 接触のため integration 配置 — `cid:code-generation:fs-tests-integration-first`)。t121 の full 限定ピンを反転し、S3(none は開かない)ケースを追加。
3. **文書同期**(`24647a2df`)— carve-out ヘッダの full-only 文言を退役。

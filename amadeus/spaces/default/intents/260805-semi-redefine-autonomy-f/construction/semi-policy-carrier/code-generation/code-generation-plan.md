# Code Generation Plan — `semi-policy-carrier`(#2253、swarm batch 2 事後作成)

上流入力(consumes 全数): business-logic-model.md, business-rules.md, domain-entities.md, security-design.md, logical-components.md

swarm 経路のため本 plan は finalize 後の事後作成(`cid:code-generation:swarm-unit-artifact-backfill`)であり、実績 = builder report(隔離 worktree builder、最終 HEAD `a627277fd`)からの転記である。base は batch 1 の 3 bolt ブランチのマージ(`2c0221d3f`)。

## 実装ステップ(実績)

1. **C8 — semi mode コマンドへの policies 搭載**(`0316c346b`)— `set-autonomy --mode semi` の policies を捨てずに搬送し、state 遷移の `after.semiPolicies` へ載せる(`withSemiPolicies` は「無ければ delete」方式でフィールド残骸を作らない)。`SEMI_POLICY_SCOPE_ID = "intent"` を単一定数として導入。
2. **C9 — `nonFullCommandDisplayDigest` の 1 定義化**と Q1 裁定どおりの digest 照合、**C10 — 不正 policies の loud ガード**(無音破棄の封鎖)、**C15 — `policyCount` の表示投影**。
3. **テスト固定**(`d8824b0f6`)— `tests/unit/t454-semi-policy-carrier.test.ts` + `tests/integration/t455-semi-policy-cli.integration.test.ts`(CLI 面)。
4. **coverage 台帳登録**(`9b84b4c45` / `fa07be9df`)— registry 登録+`renderAutonomyStatus` の semantic selector 更新。
5. **lcov 帰属の 1 行化**(`a627277fd`)— policies-file ガードを単一行へ collapse(`cid:code-generation:cg-bare-case-label-da0` ファミリの既習形)。

# 既存コード分析

## 対象コード

- `AGENTS.md`
- `.amadeus/steering/policies.md`
- `.amadeus/steering/policies/README.md`
- `.amadeus/development.md`
- `.amadeus/steering/structure.md`
- `.amadeus/domain-map.md`
- `.amadeus/context-map.md`
- `.amadeus/intents/20260701-self-development-cycle-stage-workspace/**`
- `.amadeus/intents/20260701-git-branching-policy/**`

## 既存能力

- `AGENTS.md` は、branch prefix、PR 監視、コメント対応、merge 人間委譲、worktree での `mise trust` を操作指示として持つ。
- `.amadeus/steering/policies.md` は、Intent ごとの GitHub Issue、stage0 採用判断、provenance の最低記録項目、変更種別ごとの完了条件を持つ。
- `.amadeus/development.md` は、Issue 起点、target workspace、PR 準備条件、merge 後の stage0 採用判断を標準手順として持つ。
- `.amadeus/steering/policies/README.md` は、詳細な方針記録を `.amadeus/steering/policies/` 配下へ置く方針を持つ。
- Domain Map は `BC001 自己開発運用` を採用済み Bounded Context として持つ。

## 統合点

- Git ブランチ戦略の概要は `.amadeus/steering/policies.md` の横断方針へ接続できる。
- 具体ルールは `.amadeus/steering/policies/git-branching.md` の個別 policy として接続できる。
- PR 準備条件、merge 後処理、stage0 採用判断は `.amadeus/development.md` と整合させられる。
- Intent の `traceability.md`、`acceptance.md`、PR 説明から policy 参照を追跡できる。

## ギャップ

- Git ブランチ戦略は AGENTS.md の操作指示として存在するが、Amadeus DLC 成果物から参照できる steering policy としては未登録である。
- `1 Issue 1 branch`、`origin/main` 追従、rebase、merge commit、fast-forward、docs-only 例外の扱いが成果物契約として固定されていない。
- branch 戦略違反を validator または evaluator で検出するか、人間判断だけに残すかが未整理である。
- `.amadeus/steering/policies.md` と個別 policy の責務分担が未確定である。

## リスク

- AGENTS.md と steering policy に同じ操作手順を重複して書くと、差分が生じた時に判断基準がずれる。
- branch protection や CI workflow の変更を含めると、Issue #254 の対象外へ広がる。
- merge 自動化を含めると、既存の人間委譲方針と衝突する。
- validator で検出できない人間判断を機械検査に寄せすぎると、運用上の例外を扱いにくくなる。

## Inception への入力

- 要求は、policy 採用、branch lifecycle、責務分担、参照と検出境界に分ける。
- User Story は、Maintainer が複数 Intent と複数 worktree の branch 判断を確認できる価値として扱う。
- Unit は、Git ブランチ戦略 policy と、policy 参照・検出境界に分ける。
- Bolt は、policy 配置、branch lifecycle 具体ルール、traceability と検出境界の実施境界に分ける。

## 証拠

- `AGENTS.md`
- `.amadeus/steering/policies.md`
- `.amadeus/steering/policies/README.md`
- `.amadeus/development.md`
- `.amadeus/steering/structure.md`
- `.amadeus/domain-map.md`
- [Issue #254](https://github.com/amadeus-dlc/amadeus/issues/254)
- commit `1d5d46a75906e7756cd3aeb71d6290ac6c602822`

## 鮮度

- analyzedAt: `2026-07-01T10:48:19Z`
- freshness: current

## 未確認事項

- Construction で、docs-only 例外を policy 本文に含めるか、後続 Issue 候補として切り出すかを確定する。

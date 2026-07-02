# 追跡

## Ideation からの追跡

| Ideation 要素 | 対象 | 定義元 | 後続への渡し方 |
|---|---|---|---|
| Intent | 20260702-phase-pr-consolidation-policy | [20260702-phase-pr-consolidation-policy.md](../../20260702-phase-pr-consolidation-policy.md) | Inception の要求分析で参照する。 |
| Issue | #310 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/310) | 統合条件と記録方法の Requirement、Acceptance、Use Case の根拠にする。 |
| Discovery | 20260702-phase-cycle-deterministic-contract | [Discovery Brief](../../../discoveries/20260702-phase-cycle-deterministic-contract.md) | 候補の依存順（#311 の後に扱う）の根拠にする。 |
| 先行 Intent | 20260701-git-branching-policy | [state.json](../../20260701-git-branching-policy/state.json) | branch 命名と PR 運用の定義元として整合確認の対象にする。 |
| 先行 Intent | 20260702-state-json-scaffolding | [state.json](../../20260702-state-json-scaffolding/state.json) | 統合 PR での複数 phase 分の state 更新を単純にする雛形生成の前提として参照する。 |
| 対象境界 | phase PR の統合条件と記録方法 | [scope.md](scope.md) | Inception の Requirement、Use Case、Unit、Bolt の対象と対象外の制約にする。 |
| 実行制御 | refactor、stage 省略なし | [scope.md](scope.md) | Inception から Construction へ進める前提にする。 |
| 成果物深度 | standard | [scope.md](scope.md) | 統合条件、既定の維持、記録項目を分解する入力にする。 |
| 検証戦略 | standard | [scope.md](scope.md) | policy 文書の差分と既存文書との突き合わせを PR 準備条件にする。 |
| Mock | 初期確認 | [initial-confirmation.puml](mocks/initial-confirmation.puml) | Inception で統合判定と記録の確認フローを具体化する例にする。 |
| 状態 | Ideation completed | [state.json](../state.json) | Inception へ進める前提にする。 |

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| インテント | 20260702-phase-pr-consolidation-policy | 20260701-git-branching-policy, 20260702-state-json-scaffolding | branch 命名との整合確認を含み、統合 PR の state 検証は雛形生成が前提を単純にするため。 | [intents.md](../../../intents.md) |
| Issue | #310 | #314 | 親 Issue #314 の子 Issue であり、Discovery の候補判断で依存順が確定しているため。 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/314) |
| アクター | ACT001 Maintainer | なし | 統合条件の強度と統合 PR の merge 判断を行うため。 | [actors.md](../../../steering/actors.md) |

## 受け入れ条件への対応

| 受け入れ条件 | Ideation での扱い | Inception への引き渡し |
|---|---|---|
| 統合を許可する条件と、許可しない場合の既定が policy から読める。 | scope の SC-IN-001 と SC-IN-002 に記録した。 | 統合条件の最終形と既定の記載を要求化する。 |
| 統合 PR の説明に必要な記録項目が定義されている。 | scope の SC-IN-003 に記録した。 | 記録項目を要求化する。 |
| 統合しても validator の phase 状態検証が成立する。 | ideation.md の実現可能性（技術）に記録した。 | gate 判定と PR 単位の分離を要求化する。 |
| 既存の phase ごとの PR 運用が引き続き有効である。 | scope の SC-IN-002 に記録した。 | 既定の維持を要求化する。 |
| development.md と Git Branching Policy との整合。 | scope の SC-IN-004 に記録した。 | 既存文書の分析と整合確認を Inception で行う。 |

## 逆方向 feedback

Ideation で見つかった不足は、Inception 開始時の decision review で再確認する。

Inception 以降で統合条件や記録項目がずれると分かった場合は、後段成果物だけを補修せず、Ideation の該当成果物へ戻す。

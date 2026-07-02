# スコープ

## 対象境界

### 対象

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-IN-001 | phase PR を統合してよい条件を steering policy として定義する。条件候補は、実行スコープが `refactor` または docs 系であること、変更対象が文書だけで実装コードとテストコードを含まないこと、Ideation の未確定事項が事前の grilling または Issue の確定判断で解消済みであることである。 | [Issue #310](https://github.com/amadeus-dlc/amadeus/issues/310) | 採用 |
| SC-IN-002 | 統合を許可しない場合の既定（phase ごとの PR）を policy に明記する。 | [Issue #310](https://github.com/amadeus-dlc/amadeus/issues/310) | 採用 |
| SC-IN-003 | 統合 PR の記録方法を定義する。PR 説明にどの phase 成果物を含むかを明記し、gate の判定は phase ごとに state で行う。 | [Issue #310](https://github.com/amadeus-dlc/amadeus/issues/310) | 採用 |
| SC-IN-004 | development.md の手順と Git Branching Policy の branch 命名（`codex/issue-<n>-<phase>`）との整合を確認する。 | [Issue #310](https://github.com/amadeus-dlc/amadeus/issues/310) | 採用 |

### 対象外

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-OUT-001 | Construction 実装と finalization の統合。間に merge イベントを挟むため統合できない。 | [Issue #310](https://github.com/amadeus-dlc/amadeus/issues/310) | 採用 |
| SC-OUT-002 | phase gate そのものの廃止や自動化。 | [Issue #310](https://github.com/amadeus-dlc/amadeus/issues/310) | 採用 |
| SC-OUT-003 | 大きい Intent（実装コードを含む、複数 Unit を持つなど）への適用。 | [Issue #310](https://github.com/amadeus-dlc/amadeus/issues/310) | 採用 |
| SC-OUT-004 | 初期 Ideation で後続 phase の詳細成果物や実装を作る。 | [Intent](../../20260702-phase-pr-consolidation-policy.md) | 採用 |

## 実行制御

| 項目 | 値 | 理由 |
|---|---|---|
| 実行スコープ | refactor | 既存の phase ごとの PR 運用に、統合を許可する条件を追加する文書変更であるため。 |
| 省略 stage | なし | 統合条件と記録項目を Inception で要求化し、Construction で policy 文書の変更を行うため。 |

## 成果物深度

| 項目 | 値 | 理由 |
|---|---|---|
| 深度 | standard | 統合を許可する条件、既定の維持、記録項目、既存文書との整合を追跡できる粒度が必要であるため。 |

## 検証戦略

| 項目 | 値 | 理由 |
|---|---|---|
| 戦略 | standard | policy 文書の差分、既存文書（development.md、Git Branching Policy）との突き合わせ、validator、標準検証の確認が必要であるため。 |

## Inception への引き継ぎ

- 統合を許可する条件の最終形（条件候補 3 件を必須条件にするか、一部を推奨条件にするか）を確定する。
- 統合単位の境界（どの phase まで 1 PR に統合できるか。Construction 実装と finalization の分離は前提）を確定する。
- 統合 PR の branch 命名（`codex/issue-<n>-<phase>` との整合）を確定する。
- policy の記載先（Git Branching Policy への追記か、新しい policy 文書か）を確定する。

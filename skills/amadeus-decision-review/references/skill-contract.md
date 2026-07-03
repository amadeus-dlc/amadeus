# Skill Contract: amadeus-decision-review

この文書は `amadeus-contracts/catalog/**` から生成する。
直接編集せず、Catalog を更新してから `npm run contracts:generate` を実行する。

## Source Paths

- `skills/amadeus-decision-review/SKILL.md`
- `.agents/skills/amadeus-decision-review/SKILL.md`

## Prerequisites

- `PRE001`: 対象 phase skill、対象 Intent または成果物セット、実行モードを解決できる。
- `PRE002`: 既存成果物と現在参照できる証拠の範囲を説明できる。
- `PRE003`: skill 供給元と実行環境の stage 前提を、source skill、昇格先成果物、host environment、stage0、stage1、stage2、stage0 採用判断として区別できる。

## Invariants

- `INV001`: decision review 自体は質問を実行しない。
- `INV002`: validator の pass を内容承認または質問不要の単独根拠として扱わない。

## Postconditions

- `POST001`: grill_required、no_grill、repair_only、upstream_feedback_required、follow_up_issue_candidate のいずれかに分類できる。
- `POST002`: grill_required の場合は amadeus-grilling への handoff 項目を返せる。

## Read Boundary

### Allowed

- .amadeus/intents/**
- .amadeus/steering/**
- .amadeus/domain-map.md
- .amadeus/context-map.md
- 関連 Issue/PR
- 作業ツリー
- Skill Contract

### Prohibited

- 秘密情報
- 対象外 workspace の成果物

## Write Boundary

### Allowed

- なし

### Prohibited

- 成果物の作成または更新
- 実装コード
- テストコード
- merge 操作

## Delegation

### Allowed

- `amadeus-grilling`: grill_required の場合に質問を一問だけ行う。

### Order

- amadeus-grilling

### Prohibited

- amadeus-construction-code-generation

## Grilling Conditions

- `GR001`: 人間判断が必要で、既存成果物や作業ツリーだけでは解消できない不明瞭ノードがある場合に handoff する。

## Feedback Conditions

- `FB001`: 現在 Intent の成功条件外の小さな課題は follow_up_issue_candidate として扱う。
- `FB002`: 前段 phase または前段 stage の成果物不足、矛盾、粒度誤りが現在 Intent の成功条件を妨げる場合は upstream_feedback_required として扱う。

## Consumer References

| consumer | purpose | inputs |
|---|---|---|
| `validator` | 生成物の存在、構造、参照入口を検出する。 | `generatedReferencePaths`, `prerequisites`, `invariants`, `postconditions`, `readBoundary`, `writeBoundary` |
| `evaluator` | Skill Contract と実行結果の品質評価入力にする。 | `invariants`, `postconditions`, `feedbackConditions` |
| `decision-review` | 意思決定の再確認に必要な契約条件を参照する。 | `prerequisites`, `invariants`, `postconditions`, `readBoundary`, `writeBoundary` |
| `learning-review` | 後段発見と学習候補の分類に必要な条件を参照する。 | `feedbackConditions`, `postconditions`, `consumerReferences` |

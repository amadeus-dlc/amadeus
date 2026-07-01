# スコープ

## 対象境界

### 対象

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-IN-001 | amadeus-* skill 実行中に見つかる問題や懸念の報告方針を定義する。 | [Issue #248](https://github.com/amadeus-dlc/amadeus/issues/248) | 採用 |
| SC-IN-002 | 現在の Intent に含めるか、後続 Issue にするかの判断基準を定義する。 | [Issue #248](https://github.com/amadeus-dlc/amadeus/issues/248) | 採用 |
| SC-IN-003 | 報告内容の最低項目を定義する。 | [Issue #248](https://github.com/amadeus-dlc/amadeus/issues/248) | 採用 |
| SC-IN-004 | 内部 skill、共通契約、validator または evaluator 後段のどれで扱うかを Inception で判断できる状態にする。 | [Issue #248](https://github.com/amadeus-dlc/amadeus/issues/248) | 採用 |
| SC-IN-005 | 代表的な skill で試す範囲を後続 stage へ引き継ぐ。 | [Issue #248](https://github.com/amadeus-dlc/amadeus/issues/248) | 採用 |

### 対象外

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-OUT-001 | すべての軽い感想を成果物化する。 | [Issue #248](https://github.com/amadeus-dlc/amadeus/issues/248) | 採用 |
| SC-OUT-002 | 現在の Intent に無関係な改善を自動で混ぜる。 | [Issue #248](https://github.com/amadeus-dlc/amadeus/issues/248) | 採用 |
| SC-OUT-003 | 人間の判断なしに GitHub Issue を大量作成する。 | [Issue #248](https://github.com/amadeus-dlc/amadeus/issues/248) | 採用 |
| SC-OUT-004 | validator の `pass` を内容承認として扱う。 | [Issue #248](https://github.com/amadeus-dlc/amadeus/issues/248) | 採用 |
| SC-OUT-005 | 初期 Ideation で要求、ユースケース、Unit、Bolt、Task、実装を作る。 | [amadeus-ideation](../../../.agents/skills/amadeus-ideation/SKILL.md) | 採用 |

## 実行制御

| 項目 | 値 | 理由 |
|---|---|---|
| 実行スコープ | refactor | 既存の Amadeus DLC phase を増やさず、amadeus-* skill の報告契約を整理するため。 |
| 省略 stage | なし | 報告先、判断基準、最低項目、採用方式を Inception で分解し、Construction で代表 skill に反映する必要があるため。 |

## 成果物深度

| 項目 | 値 | 理由 |
|---|---|---|
| 深度 | standard | skill 実行時の報告契約、報告先、最低項目、後続 Issue 化の判断を追跡できる粒度が必要であるため。 |

## 検証戦略

| 項目 | 値 | 理由 |
|---|---|---|
| 戦略 | standard | validator、関連 eval、必要な typecheck と diff check で、成果物契約と代表 skill の反映を確認するため。 |

## Inception への引き継ぎ

- 報告先を GitHub Issue、Intent の notes、traceability、decisions、別の報告成果物のどれにするかを要求として整理する。
- 現在の Intent に含める問題と、後続 Issue に切り出す問題の判断基準を定義する。
- 内部 skill として定義するか、各 skill の共通契約として定義するか、validator または evaluator 後段で扱うかを比較する。
- 報告内容の最低項目を Acceptance にする。
- 報告が必要な懸念と会話メモの境界を Use Case と Unit へ引き継ぐ。
- 代表的な amadeus-* skill で試す対象を Codebase Analysis で確認する。

# スコープ

## 対象境界

### 対象

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-IN-001 | phase skill 起動時の判断材料に、skill 供給元と実行環境の状態を含める。 | [Issue #278](https://github.com/amadeus-dlc/amadeus/issues/278) | 採用 |
| SC-IN-002 | source skill、昇格先成果物、host environment での利用可否を区別して記録できるようにする。 | [Issue #278](https://github.com/amadeus-dlc/amadeus/issues/278) | 採用 |
| SC-IN-003 | stage0、stage1、stage2 と stage0 採用判断の前提を、phase skill 起動時の入力証拠として扱う。 | [steering/policies.md](../../../steering/policies.md) | 採用 |
| SC-IN-004 | `amadeus-decision-review` の判断ノードまたは Skill Contract に、stage 前提確認を接続する。 | [Issue #278](https://github.com/amadeus-dlc/amadeus/issues/278) | 採用 |
| SC-IN-005 | 前提不成立時の分類先を `repair_only`、`upstream_feedback_required`、`follow_up_issue_candidate` などに整理する。 | [Issue #278](https://github.com/amadeus-dlc/amadeus/issues/278) | 採用 |
| SC-IN-006 | Issue #277 と Issue #272 の関係を、前提不成立の代表例として扱う。 | [Issue #278](https://github.com/amadeus-dlc/amadeus/issues/278) | 採用 |
| SC-IN-007 | 配布対象 skill では、repo 内 Issue 番号を前提にした説明を使わない制約を扱う。 | [PR #279](https://github.com/amadeus-dlc/amadeus/pull/279) | 採用 |

### 対象外

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-OUT-001 | phase skill の全面再設計を行う。 | [Issue #278](https://github.com/amadeus-dlc/amadeus/issues/278) | 採用 |
| SC-OUT-002 | host environment を実行時に自動検出する仕組みを作る。 | [Issue #278](https://github.com/amadeus-dlc/amadeus/issues/278) | 採用 |
| SC-OUT-003 | 全 skill の契約を一括移行する。 | [Issue #278](https://github.com/amadeus-dlc/amadeus/issues/278) | 採用 |
| SC-OUT-004 | stage0 採用判断を自動化する。 | [steering/policies.md](../../../steering/policies.md) | 採用 |
| SC-OUT-005 | GitHub Issue を自動作成する。 | [Issue #278](https://github.com/amadeus-dlc/amadeus/issues/278) | 採用 |
| SC-OUT-006 | 完了済み Intent 成果物を一括移行する。 | [Issue #278](https://github.com/amadeus-dlc/amadeus/issues/278) | 採用 |
| SC-OUT-007 | 初期 Ideation で後続 phase の詳細成果物や実装を作る。 | [amadeus-ideation](../../../.agents/skills/amadeus-ideation/SKILL.md) | 採用 |

## 実行制御

| 項目 | 値 | 理由 |
|---|---|---|
| 実行スコープ | refactor | 既存の decision review、Skill Contract、stage 判定語彙を前提に、phase skill 起動時の確認観点を補強するため。 |
| 省略 stage | なし | stage 前提確認の要求、受け入れ状態、既存コード分析、Unit、Bolt を Inception と Construction で分解する必要があるため。 |

## 成果物深度

| 項目 | 値 | 理由 |
|---|---|---|
| 深度 | standard | skill 供給元、実行環境、stage 前提、分類先、配布対象 skill の文脈分離を追跡できる粒度が必要であるため。 |

## 検証戦略

| 項目 | 値 | 理由 |
|---|---|---|
| 戦略 | standard | Skill Contract、decision review、phase skill 文書、eval または text contract、validator を確認する必要があるため。 |

## Inception への引き継ぎ

- phase skill 起動時に読む skill 供給元と実行環境の入力証拠を要求として定義する。
- source skill、昇格先成果物、host environment での利用可否、stage0、stage1、stage2、stage0 採用判断を区別する。
- stage 前提確認を `amadeus-decision-review` に置くか、Skill Contract に置くか、両方に分けるかを判断する。
- 前提不成立時の分類先を `repair_only`、`upstream_feedback_required`、`follow_up_issue_candidate` などに分ける。
- Issue #277 と Issue #272 の関係は、このリポジトリ内の代表例として扱い、配布対象 skill へ Issue 番号前提の説明を持ち込まない。
- 必要な eval または text contract、validator 確認を Construction の完了条件へ渡す。

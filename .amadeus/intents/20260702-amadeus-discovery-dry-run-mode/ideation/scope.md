# スコープ

## 対象境界

### 対象

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-IN-001 | `amadeus-discovery` に読み取り専用の `dry-run` mode を追加する。 | [Issue #272](https://github.com/amadeus-dlc/amadeus/issues/272) | 採用 |
| SC-IN-002 | `dry-run` が `.amadeus/`、既存 Discovery、既存 Intent、Issue、validator 結果、evaluator 結果、CI 結果を入力として読めることを説明する。 | [Issue #272](https://github.com/amadeus-dlc/amadeus/issues/272) | 採用 |
| SC-IN-003 | `dry-run` の出力に、入力テーマ、既存成果物との関係、Intent 候補、分類、根拠、未確認事項、判定案、推奨次アクションを含める。 | [Issue #272](https://github.com/amadeus-dlc/amadeus/issues/272) | 採用 |
| SC-IN-004 | `dry-run` と `scaffold-only` の違いを、読み取り専用と質問しない成果物作成の違いとして説明する。 | [Issue #272](https://github.com/amadeus-dlc/amadeus/issues/272) | 採用 |
| SC-IN-005 | `dry-run` が `amadeus-history-review` または `amadeus-learning-review` の結果を入力にできる責務境界を説明する。 | [Issue #272 comment](https://github.com/amadeus-dlc/amadeus/issues/272#issuecomment-4855725512) | 採用 |
| SC-IN-006 | 過去分析、学習分類、Intent 候補表示の責務を混ぜないことを Inception へ引き渡す。 | [Issue #272 comment](https://github.com/amadeus-dlc/amadeus/issues/272#issuecomment-4855754804) | 採用 |
| SC-IN-007 | source skill、昇格先成果物、eval または text contract の更新を扱う。 | [steering/policies.md](../../../steering/policies.md) | 採用 |

### 対象外

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-OUT-001 | Discovery 成果物の構造を変更する。 | [Issue #272](https://github.com/amadeus-dlc/amadeus/issues/272) | 採用 |
| SC-OUT-002 | Intent Record を自動作成する。 | [Issue #272](https://github.com/amadeus-dlc/amadeus/issues/272) | 採用 |
| SC-OUT-003 | GitHub Issue を自動作成する。 | [Issue #272](https://github.com/amadeus-dlc/amadeus/issues/272) | 採用 |
| SC-OUT-004 | `amadeus-ideation` を自動実行する。 | [Issue #272](https://github.com/amadeus-dlc/amadeus/issues/272) | 採用 |
| SC-OUT-005 | 過去分析そのものを `dry-run` に直接実装する。 | [Issue #272 comment](https://github.com/amadeus-dlc/amadeus/issues/272#issuecomment-4855725512) | 採用 |
| SC-OUT-006 | 学習分類そのものを `dry-run` に直接実装する。 | [Issue #272 comment](https://github.com/amadeus-dlc/amadeus/issues/272#issuecomment-4855725512) | 採用 |
| SC-OUT-007 | validator を意味検証エンジンへ拡張する。 | [Issue #272](https://github.com/amadeus-dlc/amadeus/issues/272) | 採用 |
| SC-OUT-008 | 完了済み Intent を一括再分類する。 | [Issue #272](https://github.com/amadeus-dlc/amadeus/issues/272) | 採用 |
| SC-OUT-009 | 初期 Ideation で後続 phase の詳細成果物や実装を作る。 | [amadeus-ideation](../../../.agents/skills/amadeus-ideation/SKILL.md) | 採用 |

## 実行制御

| 項目 | 値 | 理由 |
|---|---|---|
| 実行スコープ | refactor | 既存の Discovery mode を維持しつつ、読み取り専用の候補探索を追加するため。 |
| 省略 stage | なし | `dry-run` の要求、受け入れ状態、既存コード分析、Unit、Bolt、検証観点を Inception と Construction で分解する必要があるため。 |

## 成果物深度

| 項目 | 値 | 理由 |
|---|---|---|
| 深度 | standard | 読み取り対象、出力項目、禁止する副作用、`scaffold-only` との差分、過去分析と学習分類との境界を追跡できる粒度が必要であるため。 |

## 検証戦略

| 項目 | 値 | 理由 |
|---|---|---|
| 戦略 | standard | source skill、昇格先成果物、読み取り専用契約、eval または text contract、validator を確認する必要があるため。 |

## Inception への引き継ぎ

- `dry-run` の入力対象と出力項目を要求として定義する。
- `.amadeus/discoveries/**`、`.amadeus/intents/**`、steering layer、Issue、PR、validator 結果、evaluator 結果、CI 結果の扱いを整理する。
- `dry-run` が `.amadeus/` 配下を作成または更新しないことを受け入れ状態に落とす。
- `dry-run` が GitHub Issue 作成、Intent Record 作成、`amadeus-ideation` 自動実行を行わないことを受け入れ状態に落とす。
- `dry-run` と `scaffold-only` の責務差分を要求または判断として残す。
- `amadeus-history-review` と `amadeus-learning-review` は入力候補として扱い、過去分析と学習分類を `dry-run` 自体へ混ぜない。
- 必要な eval または text contract、validator 確認を Construction の完了条件へ渡す。

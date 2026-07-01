# 追跡

## Ideation からの追跡

| Ideation 要素 | 対象 | 定義元 | 後続への渡し方 |
|---|---|---|---|
| Intent | 20260702-stage-prerequisite-checks | [20260702-stage-prerequisite-checks.md](../../20260702-stage-prerequisite-checks.md) | Inception の要求分析で参照する。 |
| Issue | #278 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/278) | Requirement、Acceptance、Use Case、Unit、Bolt の根拠にする。 |
| 先行 Intent | 20260701-history-learning-review-skills | [state.json](../../20260701-history-learning-review-skills/state.json) | 前提不成立の代表例と内部 skill 追加の完了状態を参照する。 |
| 関連 Intent | 20260701-decision-review-grilling-gate | [state.json](../../20260701-decision-review-grilling-gate/state.json) | stage 前提確認を decision review へ接続できるか確認する。 |
| 関連 Intent | 20260701-skill-contract-catalog | [state.json](../../20260701-skill-contract-catalog/state.json) | Skill Contract の入力証拠として stage 前提を扱えるか確認する。 |
| 関連 Intent | 20260701-self-development-cycle-stage-workspace | [state.json](../../20260701-self-development-cycle-stage-workspace/state.json) | stage0、stage1、stage2、stage0 採用判断の語彙と方針を参照する。 |
| 対象境界 | skill 供給元と実行環境の stage 前提確認 | [scope.md](scope.md) | Inception の Requirement、Use Case、Unit、Bolt の対象と対象外の制約にする。 |
| 実行制御 | refactor、stage 省略なし | [scope.md](scope.md) | Inception から Construction へ進める前提にする。 |
| 成果物深度 | standard | [scope.md](scope.md) | 確認対象、分類先、配布対象 skill の制約を分解する入力にする。 |
| 検証戦略 | standard | [scope.md](scope.md) | Skill Contract、decision review、eval、validator の確認を PR 準備条件にする。 |
| Mock | 初期確認 | [initial-confirmation.puml](mocks/initial-confirmation.puml) | Inception で phase skill 起動時の確認フローを具体化する例にする。 |
| 状態 | Ideation completed | [state.json](../state.json) | Inception へ進める前提にする。 |

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| インテント | 20260702-stage-prerequisite-checks | 20260701-history-learning-review-skills | Issue #278 は、Issue #277 と Issue #272 の前提不成立を代表例にするため。 | [intents.md](../../../intents.md) |
| Issue | #278 | #277 | #277 で補修した内部 skill 不足を、phase skill 起動時に検出する観点として扱うため。 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/277) |
| Issue | #278 | #272 | #272 が前提にした内部 skill が存在しない問題を代表例にするため。 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/272) |
| Issue | #278 | #259 | #259 の学習分類契約と後続 Issue 候補の扱いが前提不成立の分類先に関係するため。 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/259) |
| Intent | 20260701-decision-review-grilling-gate | 20260701-skill-contract-catalog | decision review は Skill Contract と既存成果物を入力証拠にするため。 | [intents.md](../../../intents.md) |
| 外部システム | EXT001 GitHub | なし | Issue、PR、CI 結果、後続 Issue 候補を追跡の根拠に使うため。 | [external-systems.md](../../../steering/external-systems.md) |
| アクター | ACT001 Maintainer | なし | stage0 採用判断、配布対象 skill の文脈分離、分類先を承認するため。 | [actors.md](../../../steering/actors.md) |

## 受け入れ条件への対応

| 受け入れ条件 | Ideation での扱い | Inception への引き渡し |
|---|---|---|
| phase skill 起動時の判断材料に skill 供給元と実行環境の状態を含める。 | scope の SC-IN-001 に記録した。 | 入力証拠として要求化する。 |
| `amadeus-decision-review` または Skill Contract に stage 前提確認項目を追加する。 | scope の SC-IN-004 に記録した。 | どちらに置くか、または両方へ分けるかを decisions に残す。 |
| source skill、昇格先成果物、host environment での利用可否を区別する。 | scope の SC-IN-002 に記録した。 | 具体的な証拠と完了条件に分解する。 |
| 前提不成立時の分類先を明記する。 | scope の SC-IN-005 に記録した。 | `repair_only`、`upstream_feedback_required`、`follow_up_issue_candidate` の条件を acceptance に落とす。 |
| #277 と #272 の関係を例として説明できる。 | scope の SC-IN-006 と traceability に記録した。 | repo 内代表例として扱い、配布対象 skill へ Issue 番号前提を持ち込まない。 |
| 配布対象 skill に repo 内 Issue 番号を前提にした説明を混ぜない。 | scope の SC-IN-007 に記録した。 | text contract または review 観点として扱うかを判断する。 |

## 逆方向 feedback

Ideation で見つかった不足は、Inception 開始時の decision review で再確認する。

Inception 以降で stage 前提確認の管理元がずれると分かった場合は、後段成果物だけを補修せず、Ideation の該当成果物へ戻す。

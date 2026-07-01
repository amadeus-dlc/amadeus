# UC001: 実行時懸念の検出と分類

## システム境界

- Agent が amadeus-* skill を実行中に見つけた問題や懸念を、報告対象として分類する相互作用を扱う。

## 事前条件

- 対象 Intent の目的、対象境界、要求、Unit、Bolt のいずれかを参照できる。
- 発見した問題や懸念の根拠となる成果物、差分、検証結果、Issue、PR のいずれかを参照できる。

## 基本フロー

1. Agent は skill 実行中に問題または懸念を見つける。
2. Agent は現在の Intent 対象に直接追跡できるか確認する。
3. Agent は現在の Intent 対象、後続 Issue 候補、報告不要のいずれかに分類する。
4. Agent は最低報告項目を揃え、報告内容を作業報告に含める。
5. Agent は validator または evaluator で検出すべき観点がある場合、その候補を報告に含める。

## 代替フロー

- 根拠が不足している場合、Agent は報告候補に `未確認` を残し、推測で Issue 化しない。
- 現在の Intent に直接必要な問題である場合、Agent は対象成果物や Task に反映し、後続 Issue 候補として扱わない。

## 事後条件

- 問題や懸念が、現在の Intent 対象、後続 Issue 候補、報告不要のいずれかに分類されている。
- 現在の Intent に無関係な改善が成果物へ混入していない。

## BCE候補

| 種別 | 候補 | 責務 |
|---|---|---|
| 境界 | Skill Execution Report Boundary | skill 実行中の報告契約を利用者へ示す。 |
| 制御 | Report Classification Control | 報告先分類と最低項目の充足を制御する。 |
| エンティティ | Execution Concern Report | 問題、懸念、分類、根拠、推奨を保持する。 |

## 責務候補

| 候補 | 判断 | 保持 | 依頼 |
|---|---|---|---|
| Agent | 採用 | 問題検出、分類、最低項目の提示 | Maintainer へ Issue 化判断を依頼する。 |
| Maintainer | 採用 | Issue 化の承認判断 | Agent へ起票または対象外化を依頼する。 |
| Validator または Evaluator | 採用 | 構造検出または内容評価の候補 | Agent が報告に検出候補を含める。 |

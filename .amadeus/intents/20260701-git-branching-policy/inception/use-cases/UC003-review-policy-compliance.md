# UC003: policy 準拠を確認する

## システム境界

- Maintainer または Reviewer が、PR と Intent 成果物から Git ブランチ戦略 policy への準拠を確認する。

## 事前条件

- Git ブランチ戦略 policy の配置方針と branch lifecycle ルールが整理されている。
- PR と対象 Intent がリンクされている。

## 基本フロー

1. Reviewer は PR の対応 Issue と対象 Intent を確認する。
2. Reviewer は branch 名、基点、検証結果、merge 後処理の記録が policy と矛盾しないか確認する。
3. Reviewer は validator または evaluator で検出できる候補を確認する。
4. Maintainer は機械検査で扱えない例外判断、merge 可否、人間承認の妥当性を判断する。
5. Agent は確認結果を Inception または PR 説明へ記録する。

## 代替フロー

- policy から外れるが有効な運用が見つかった場合は、現在の Intent に混ぜず、後続 Issue 候補として報告する。

## 事後条件

- policy 参照と検出境界が、後続 Construction の検証観点として渡せる。

## BCE候補

| 種別 | 候補 | 責務 |
|---|---|---|
| 境界 | Review Evidence | PR、CI、review comment、Intent traceability を確認する。 |
| 制御 | Policy Compliance Review | 機械検査候補と人間判断の境界を分ける。 |
| エンティティ | Policy Reference | Intent 成果物が参照する policy を表す。 |

## 責務候補

| 候補 | 判断 | 保持 | 依頼 |
|---|---|---|---|
| Policy Compliance Review | 採用候補 | 検出候補、人間判断、例外判断 | validator または evaluator に検出可能な構造を渡す |
| Policy Reference | 採用候補 | policy path、参照元、証拠 | PR 説明と traceability に証拠を渡す |

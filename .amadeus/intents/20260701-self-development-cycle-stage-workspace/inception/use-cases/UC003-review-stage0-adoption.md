# UC003: stage0 採用判断を確認する

## システム境界

- Maintainer が Issue、PR、CI、Intent 成果物から stage2 を次回 stage0 として採用するか判断する。
- Agent は判断材料を提示するが、採用判断そのものは Maintainer が行う。

## 事前条件

- stage 判定方針が整理されている。
- workspace 対応記録と検証結果が追跡できる。

## 基本フロー

1. Maintainer が対象 PR の merge 状態を確認する。
2. Maintainer が build workspace が merge 後の基準 commit を参照しているか確認する。
3. Maintainer が validator と標準検証結果を確認する。
4. Maintainer が stage2 を次回 stage0 として採用するか判断する。
5. Agent が判断結果を対象成果物または PR 説明へ記録する。

## 代替フロー

- 採用条件を満たさない場合は、次回 stage0 として採用しない判断を記録する。

## 事後条件

- Maintainer の stage0 採用判断が追跡できる。

## BCE候補

| 種別 | 候補 | 責務 |
|---|---|---|
| 境界 | Adoption Review Record | Maintainer が判断材料を読む入口。 |
| 制御 | Adoption Review | merge、commit、検証結果、workspace 対応を確認する。 |
| エンティティ | Stage0 Adoption Decision | 採用可否と根拠を表す。 |

## 責務候補

| 候補 | 判断 | 保持 | 依頼 |
|---|---|---|---|
| Adoption Review Record | 採用候補 | 採用可否、根拠、検証結果 | Construction で主記録先を確定する。 |

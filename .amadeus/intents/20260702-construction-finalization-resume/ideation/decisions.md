# Ideation 判断

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| D001 | finalization の再開と検出を Ideation から Inception へ進める。 | accepted | D002 | [D001-complete-ideation.md](decisions/D001-complete-ideation.md) |
| D002 | 検出スクリプトを dev-scripts ではなく同梱スクリプトへ置く。 | accepted | なし | [D002-bundled-script-placement.md](decisions/D002-bundled-script-placement.md) |

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | D002 | 検出スクリプトの配置判断が、対象境界と対象外を確定する前提になるため。 |
| D002 | なし | Maintainer の指示で確定した配置判断を Ideation の範囲判断として記録するため。 |

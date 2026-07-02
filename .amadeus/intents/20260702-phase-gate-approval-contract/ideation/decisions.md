# Ideation 判断

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| D001 | 人間ゲートと承認 evidence 検査の契約を Ideation から Inception へ進める。 | accepted | D002 | [D001-complete-ideation.md](decisions/D001-complete-ideation.md) |
| D002 | Issue #306 と #307 を 1 つの Intent に統合して扱う。 | accepted | なし | [D002-single-intent-for-gate-contract.md](decisions/D002-single-intent-for-gate-contract.md) |

## 依存関係

| 判断 | 依存 | 理由 |
|---|---|---|
| D001 | D002 | 統合判断が対象境界と成功条件の範囲を確定する前提になるため。 |
| D002 | なし | Discovery の Grilling Decision Trail（GD002）で Maintainer が確定した統合判断を、Ideation の範囲判断として記録するため。 |

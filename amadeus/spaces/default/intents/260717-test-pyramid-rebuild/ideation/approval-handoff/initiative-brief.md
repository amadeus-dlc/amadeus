# Initiative Brief — test-pyramid-rebuild(#684)

上流入力(consumes 全数): `../intent-capture/intent-statement.md`、`../scope-definition/scope-document.md`、`../scope-definition/intent-backlog.md`、`../feasibility/feasibility-assessment.md`、`../feasibility/constraint-register.md`

## 概要

Issue #684(P0、ユーザー指示): テストピラミッドをテストサイズ基準で再構築。実測(unit 211中162 medium=アイスクリームコーン型)を起点に、分類台帳+層設計+比率目標+実行時間予算+再編計画を作る。実移設は別 intent(Out)。

## 実現可能性

feasibility **GO**: 分類基盤(classifyTestSize・test_pyramid コレクタ・size ドリフトゲート)が既存実在。fan-out スイープで機械分類可。

## ハンドオフ内容(inception へ)

- バックログ B-1〜B-5(分類台帳/層責務/比率+予算/移設 Issue 分割/#683 整合)
- 制約 C-1〜C-7(計測導出・グリーン維持・既存分類器正・ドリフトゲート非破壊・#683・units 分割・fan-out 運用)
- 残リスク R-1〜R-4: requirements/design のエージェント選挙で解消(承認済み方針)
- RE 段で fan-out 分類スイープ(rubric 1本化・effort low・境界 high)を実装

## 承認

inception 進行を承認(Q1=A)。次: reverse-engineering(分類スイープ)以降。

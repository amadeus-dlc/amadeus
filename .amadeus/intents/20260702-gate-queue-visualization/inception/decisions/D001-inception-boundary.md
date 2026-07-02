# D001: Inception の所有境界

## 背景

Issue #350 は、複数 Intent の `state.json` を横断スキャンし、承認待ちの Intent、phase、ゲート、待ち理由を一覧する手段を求める。
既存コードには、判定の定義元になるゲート語彙契約（`task-generation-contract.ts`）、横断スキャンの先例（`list-unfinalized-intents.ts`）、同梱スクリプトの配置と promote の先例（`StateScaffold.ts`、`IndexGenerate.ts`）がある。

## 判断

Inception の所有境界を brownfield として固定する。

対象は、承認待ち判定の導出規約、横断スキャン、Markdown 表と 0 件表示の出力契約、`amadeus-validator` への同梱と手順記載、検証の先行追加である。

対象外制約として次を固定する（scope.md の SC-OUT-001 から SC-OUT-004）。

- 承認そのものの自動化。
- 通知基盤。
- 並行実行の他候補（並行運用ポリシー、Bolt の依存 wave 並行実行）。
- 複数人チームでの並行と複数 workspace での組織利用。

## 理由

判定の定義元、走査規約、配置と配布の経路がすべて既存コードに確立しており、既存能力への統合として設計するのが最小であるため。

## 影響

Unit Design Brief は既存の契約と先例への統合を前提に書かれ、Construction の Functional Design は待ち理由の文言写像と CLI 契約の確定に集中できる。

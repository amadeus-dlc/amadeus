# Requirements Analysis 質問 — plugin-host-delivery

> 上流入力(consumes 全数): intent-statement、scope-document、business-overview、architecture、code-structure、team-practices
> 回答方式: ソロモード。本ステージの質問は 0 問(下記の選挙不要判定)。

## 選挙不要判定(0 問の根拠 — 1 問 1 行)

- 機能要件の骨格: 旧 #1543 本文(ユーザー起草)+ scope-document IN 1-10 で既決 — 要件化は既決裁定の成文化
- 対象ハーネス集合: feasibility Q1 裁定(7 ハーネス)で既決
- 自動 compose の対象範囲: 「対応ホストのみ・非対応は明示 degrade」の条件構造が intent-statement / scope-document で既決。どのホストが「対応」かは FR-1 マトリクスの実測出力が決める(先取りの質問は成立しない)
- compose CLI 入口の具体形・トリガーのタイミング(eager/lazy): 既存実装の流儀(utility verb 体系・各ハーネスフックの実挙動)から design 段で導出(cid:requirements-analysis:c5 — 既存に答えがある事項はユーザーに問わない)
- activation policy: application-design の ADR + 承認ゲートで裁定と既決(intent-capture Q3)。requirements は裁定の判定条件のみ固定し、結論は【裁定待ち】プレースホルダ(cid:requirements-analysis:ruling-dependent-placeholder)
- 起動レイテンシ予算の数値: 未実測値を受け入れ基準にしない(cid:nfr-requirements:estimates-not-acceptance-criteria)— no-op 高速路の存在+退行検知の仕組みを要件化し、数値は build-and-test の実測で固定

## 裁定の記録

- 0 問判定はソロモード conductor 判定。本ステージの approve でユーザーが requirements.md ごと裁定する

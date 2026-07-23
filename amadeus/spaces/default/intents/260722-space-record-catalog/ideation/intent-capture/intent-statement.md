# Intent Statement — 260722-space-record-catalog

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない)

## Problem Statement

Space 配下のライフサイクルレコード(Intent と選挙の総称 — ユーザー裁定 2026-07-23)は、コレクションごとに識別子・表示名・日時・レジストリの扱いがバラバラである。`intents/` は UUID+dirName+`intents.json` を持つが作成・更新日時の共通フィールドがなく、`elections/` は選挙 ID ディレクトリ直参照でレジストリ自体がない。結果、機械は安定参照できるが、人間が GitHub・ファイルツリー・CLI から「何がいつ起き、いま何が動いているか」を時系列で追えない。Election 単体の一覧を場当たりに足すと Space 全体の情報設計はさらに不統一になる(Issue #1309)。

## Target Customer

- **リポジトリ閲覧者**(GitHub・ファイルツリーを直接見る人間): 日付別・新しい順の Markdown 投影で開催順・活動履歴を追いたい
- **CLI 利用者**(セッション内のエージェント運用者・leader): Space 全体および種別ごとの時系列一覧を即座に得たい

両者は同格で扱う(ユーザー裁定 2026-07-23、Q1=C)。【注記 2026-07-23: 提供手段は当初の CLI 一覧+Markdown 投影からスコープ縮小裁定により変更 — 日付接頭辞 dirName(ファイルツリーの自然ソート)とレジストリで同じ顧客ニーズを満たす。Amendment 節参照】

## Success Metrics

本 intent は「整理」を目的とし、ideation(scope-definition まで)完了時点で park する。完了の定義(ユーザー裁定 2026-07-23、Q2=C):

1. 分解 ADR 相当の整理成果物(Space 配下の役割分類+4関心事の分解+依存順序)が承認されている
2. 未決事項の裁定が全件記録されている(用語衝突は裁定済み: 「ライフサイクルレコード」。残り: createdAt 導出・タイムゾーン規則・投影配置は本 intent 内で裁定)
3. Issue #1309 がミラー Issue 化されている(本文 = タイトル+概要+record リンク+状態行、設計詳細は record 正本)

## Initiative Trigger

Issue #1309 の起票(選挙ディレクトリの人間可読性問題が発端)。加えて、同 Issue が intent-first ノルム以前の「影の仕様書」形式で放置されており、record 正本への移行(ミラー化)が規範適合のため必要になった。

## Initial Scope Signal

scope = `amadeus`(本 repo の既定スコープ)。設計整理 intent であり、4関心事(①共通レコード契約 ②Catalog seam ③人間向け投影 ④移行)は単一 intent 内で層別設計し、実装段階の units-generation で Unit 分割する(ユーザー裁定 2026-07-23、Q4=A)。実装・既存ディレクトリの rename・Election 限定の場当たり INDEX は非目標(#1309 非目標を継承)。

## Amendment — スコープ縮小裁定(2026-07-23)

feasibility 段のユーザー裁定により、本 intent のスコープを次へ縮小する(intent-capture Q4=A の「4関心事の層別設計」を置換。承認済み記述の変更につき申告追補 — P3 準拠):

- **やる**: elections/ を intents/ の構造モデルに統一する設計 — (1) elections レジストリ+日付接頭辞 dirName 規約 (2) レジストリ経由の electionId→パス解決(最小限の解決層) (3) doctor へのレジストリ vs 実ディレクトリ drift 検出。既存103件の移行方針(createdAt は timeline 最古イベント導出+空 timeline フォールバック)を含む
- **やらない(非目標化)**: SpaceRecordCatalog モジュール、renderActivity、人間向け Markdown 投影、正式な共通レコード契約 interface — 構造統一で発端の痛み(時系列可読性)が解消するため投機的一般化として除外
- 完了定義(Q2=C: 整理成果物+裁定全件記録+#1309 ミラー化)は不変

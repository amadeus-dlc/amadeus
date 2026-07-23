# Feasibility 質問(260722-space-record-catalog)

> 上流入力(consumes 全数): intent-statement。前提: 統合対象・技術スタック・規制はすべて実測で確定済み(feasibility-assessment.md — cid:feasibility:c1 により質問化しない)。残る質問は intent-statement の完了定義が「裁定の全件記録」を要求する未決2件のみ。
>
> 運用モード: チームモード。本 intent はユーザー明示指示により leader セッションのユーザー対話モードで実行(intent-capture diary 参照)。[Answer] 記入はユーザー裁定受領後のみ。
>
> E-OC1 証跡: 全2問はユーザー対話モード(leader セッション実 HUMAN_TURN)での直接裁定により確定(Q2 はスコープ縮小裁定へ発展)。leader 承認: 2026-07-22T21:52:29Z(裁定受領と同時に記入)。

## Q1. 日時の表示タイムゾーン規則はどれにしますか?

#1309 の受け入れ基準「UTC 正本と表示タイムゾーンの規則が定義されている」の裁定。正本(記録上の値)は UTC で固定し(既存 audit・timeline と同じ)、**人間向け表示**の規則だけを問います。

- A. 表示も UTC のまま(最も単純。既存 audit の読み方と同一)
- B. 表示は JST 固定(このチームの実利用に最適化。他 TZ 利用者には不便)
- C. 表示は閲覧環境のローカル TZ(CLI は環境依存で可変。Markdown 投影は生成時に固定が必要になり規則が複雑化)
- D. UTC+JST 併記
- X. その他(自由記述)

[Answer]: A(ユーザー裁定 2026-07-23、leader セッション実 HUMAN_TURN)— 表示も UTC のまま。正本・表示とも UTC で統一。

## Q2. 人間向け Markdown 投影の配置はどこにしますか?

#1309 の受け入れ基準「GitHub やファイルツリーから辿れる投影」の配置裁定。いずれも正本から再生成される生成物で、drift 検出対象。

- A. `amadeus/spaces/<space>/activity/` を新設し、その配下に時系列ビュー(空間の他の分類 — memory/knowledge/codekb/intents/elections — と並ぶ「人間向け投影」の専用置き場。#1309 の役割分類 4 に対応)
- B. `amadeus/spaces/<space>/ACTIVITY.md` 単一ファイル(最少構成。件数増で肥大)
- C. 配置は application-design(実装 intent)へ委ねる(本 intent では「space 直下・再生成可能・drift 検証可」の性質だけ固定)
- X. その他(自由記述)

[Answer]: X(ユーザー裁定 2026-07-23、leader セッション実 HUMAN_TURN)— 投影そのものを本 intent の非目標とする。同裁定でスコープを「elections を intents 構造モデル(日付接頭辞 dirName+レジストリ+ID 解決)に統一+doctor drift 検出」へ縮小し、SpaceRecordCatalog・renderActivity・Markdown 投影・共通レコード契約 interface を落とす(将来必要になれば別 intent)。

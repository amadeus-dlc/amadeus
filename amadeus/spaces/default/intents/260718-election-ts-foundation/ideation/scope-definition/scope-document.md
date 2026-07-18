# Scope Document — election-ts-foundation

> 上流入力(consumes 全数): intent-statement.md、feasibility-assessment.md、constraint-register.md

## In Scope(全て Must — Q1 裁定: Should/Could を置かない)

選挙4類型(明確化質問・§13 採否・ブロッカー選挙・0件確認)のライフサイクル全体:

| ID | 能力 | 内容 |
|---|---|---|
| S-01 | 起票 | 選挙定義(質問・選択肢・投票者集合・種別)を構造データとしてファイル正本に作成(C-07) |
| S-02 | 配信 | 各投票者へ agmsg で「選挙 ID+正本パス」の短通知(blind: 推奨・先行票は正本に含めない) |
| S-03 | 投票収集 | 構造化票形式(選択+GoA+留保欄+根拠自由文)の受領・受付台帳(未着の可視化 — ack 機械化) |
| S-04 | 開票 | GoA 集計の決定的計算(賛成 1-3/6・反対 7-8・棄権4除外・8 ブロック保留・多数決/タイ判定)。結果は「成立/保留(要人間)」 |
| S-05 | 記録生成 | 票タイムライン・GoA 度数行・persist 文素案の自動生成(既存 parseGoaLine スキーマ互換 — C-08) |
| S-06 | 照合 | 留保必須票(2/3/6)の件数 vs 転記の機械照合、票数表記の照合(現行の人力チェックの機械化) |
| S-07 | 開票時票公開 | 開票時に全票を一括ファイル化(blind 解除・監査可能性の回復 — Q3=A) |
| S-08 | SKILL 薄ラップ | 上記 CLI を呼ぶ薄い user-invocable SKILL(判断はラップしない) |

## Out of Scope(Won't — 厳格除外)

| ID | 除外 | 根拠 |
|---|---|---|
| W-01 | E-OC1(選挙不要判定)の申告・承認管理 | intent-capture Q2 裁定 — データ形が異なる。拡張点として申し送り |
| W-02 | Issue クロスレビューの verdict 収集・2名成立判定 | 同上 |
| W-03 | PM ラウンド(候補募集・violation カウント・蒸留選挙) | 同上。ただし S-05 の記録は norm-metrics スキーマ互換で下流を壊さない |
| W-04 | framework 配布(dist/ハーネス投影・製品化) | feasibility Q1 裁定 — チーム内ツール。製品化は実証後の将来判断 |
| W-05 | agmsg の置換・改修 | 輸送層はそのまま利用(D-01) |
| W-06 | 人間裁定の自動化(タイ・GoA 8 再審・エスカレーション) | C-01 — ツールは判断材料と記録のみ |
| W-07 | 既存ノルムの縮約実行 | P-01 — 着地後の蒸留ラウンド手続き。本 intent は方針記録のみ |
| W-08 | 本 intent での実装 | ユーザー指示 — 本 intent は ideation のみ。実装は mirror Issue 経由の将来 intent |

## 実施範囲と出口

- 本 intent: ideation(intent-capture → feasibility → scope-definition → approval-handoff)のみ
- 出口: approval-handoff 完了後、`scripts/amadeus-mirror.ts create` で mirror Issue を起票・同期し、workflow を park(intent-first-mirror-issue 準拠)
- Inception 以降(requirements での票形式固定・設計・実装)は将来 intent — 着手はユーザー決定(issue-selection-user-decides)

## 成功指標(intent-statement から再掲)

1. 選挙系手作業違反カウント(PM ラウンド実測)ゼロ
2. ノルム PR レビューでの票数・タイムライン・留保転記の照合指摘ゼロ

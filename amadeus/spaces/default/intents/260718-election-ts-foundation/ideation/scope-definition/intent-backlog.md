# Intent Backlog — election-ts-foundation

> 上流入力(consumes 全数): intent-statement.md、feasibility-assessment.md、constraint-register.md(F-01〜F-03 は constraint-register の U-01〜U-03、F-06 は P-01 に由来)

## 本 intent(ideation のみ)

| # | 項目 | 状態 |
|---|---|---|
| 1 | intent-capture(発意・スコープ境界・成功指標の確定) | 完了 |
| 2 | feasibility(GO 判定・制約8件・実現方式3裁定) | 完了 |
| 3 | scope-definition(S-01〜S-08 / W-01〜W-08 の確定) | 本ステージ |
| 4 | approval-handoff(ideation 完了検証+ハンドオフ文書) | 次ステージ |
| 5 | mirror Issue 起票・同期(`scripts/amadeus-mirror.ts create`)→ park | 出口処理 |

## 将来 intent への申し送り(実装フェーズ — 着手はユーザー決定)

| # | 項目 | 由来 |
|---|---|---|
| F-01 | 構造化票形式の requirements 固定(フィールド・記法・テスト可能受け入れ基準) | U-02 |
| F-02 | ツール配置・CLI 分割の設計(scripts/ 配下の構成) | U-01 |
| F-03 | 選挙記録ファイルの配置設計(record 配下 or 専用台帳) | U-03 |
| F-04 | 開票ロジックの「落ちる実証」テスト群(全 GoA 分岐・タイ・ブロック・後着票・型不正入力) | R-04 緩和 |
| F-05 | 導入初期の現行様式並記(照合期間)の要否判断 | R-04 緩和 |
| F-06 | 着地後のノルム縮約(蒸留選挙+ノルム PR) | P-01 |

## 将来拡張(スコープ外の申し送り — データモデル拡張点)

| # | 項目 |
|---|---|
| X-01 | E-OC1(選挙不要判定)の申告・承認の構造化 |
| X-02 | Issue クロスレビュー verdict の収集・2名成立判定 |
| X-03 | PM ラウンド(候補募集・violation カウント)の構造化 |
| X-04 | framework 製品機能化(配布・多チーム利用) |

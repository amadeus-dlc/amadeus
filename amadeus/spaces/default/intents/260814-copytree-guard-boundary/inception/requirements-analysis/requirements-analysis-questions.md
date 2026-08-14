# Requirements Analysis — 質問と裁定(260814-copytree-guard-boundary)

承認: full autonomy ladder による AUTO_DECIDED 3件(Q1 `auto-decision-63bff6efefc54f7706d3611fb3478c38` 2026-08-14T07:25:04Z / Q2 `auto-decision-4f0b1ff4b1e699626101c16637fb29cf` 2026-08-14T07:25:04Z / Q3 `auto-decision-29c8092527516c387fb186c424ed2dfe` 2026-08-14T07:25:04Z、`amadeus-bolt decide-question` の decided 出力より転記)。

Intent autonomy: **full**(intent-grant-734a842b12155042ffdd9db940c60714)。質問バジェット: Minimal ≤4、実使用 3。

既決事項(再質問しない): 欠陥の実在と機序(xrev-260814-3014 2名成立)、TDD 必須、検証セット、PR マージ人間専権。

## Q1. スコープ (a) の適用範囲

A. dest-fresh な再帰木 5 サイト(tui-fixtures.ts:170/172/177/179/188)へ適用し、除外 3 面(単一ファイル 2 面 = ENOTDIR 確定赤 / fixtures.ts:867 = dest-fresh 不成立・merge 依存)は帰属根拠つきで doc 明示
B. pred-a2 全 8 面へ適用 / C. 全面先送り
X. Other (please specify)

[Answer]: A — `apply-5-sites-doc-excluded`(decisionId auto-decision-63bff6ef、agent-recommendation rung + loud degradation)。根拠: 全面適用 AC は実測により達成不能(c3-measurable-ac-must-not-void-ruling の帰属条件型で書く)。**Mode:** full-autonomy ladder

## Q2. スコープ (c) の方式

A. c1 = exists 除去(6 行削除、assert 変更 0)
B. c2 = 診断シーム化(契約追加 + 既存テスト前提反転 + allowlist 連動)
X. Other (please specify)

[Answer]: A — `c1-remove-exists`(decisionId auto-decision-4f0b1ff4)。根拠: c2 は enhancement 形 + 既存の明示契約(「ops は診断に影響しない」)の反転 = 仕様変更接近。**Mode:** full-autonomy ladder

## Q3. スコープ (b) の行き先

A. enhancement Issue として分離起票(#3014 クローズ時に行き先明記)
B. 本 intent に含める / C. 無言で落とす
X. Other (please specify)

[Answer]: A — `file-enhancement-issue`(decisionId auto-decision-29c80925)。根拠: xrev 両者が enhancement 形と判定。無言の省略は黙示の欠落。**Mode:** full-autonomy ladder

# Initiative Brief — metrics 可視化(B1 後続)

上流入力(consumes 全数): intent-statement.md, scope-document.md, intent-backlog.md, feasibility-assessment.md, constraint-register.md

## 概要

1. **問題**(intent-statement.md): `metrics/` に123件のスナップショットが蓄積済みだが可視化手段がなく、コードベース健全性のトレンドを把握できない。#921 論点欄 → 260712 バックログ B1 の正式後続
2. **判定**(feasibility-assessment.md): GO — データ全件 parse 成功・スキーマ均一・約193KB、既存パーサ(metrics-timeseries.ts)と CI job(ci.yml:398-449)を再利用、依存追加ゼロで成立
3. **スコープ**(scope-document.md): In 7項 / Out 5項、測定可能な成功基準 S1〜S5。非採用案・将来項目は intent-backlog.md V1〜V4 に台帳化
4. **制約**(constraint-register.md): C1〜C8 — 依存ゼロ、生成物正本分離、読み取り専用消費、パーサ単一正本、loud-fail 非対称維持、retention 上限、Codecov 非重複、言語規約

## Inception への引き継ぎ

- Ideation で確約するリソースは分析と人間ゲートまで(Team Formation は SKIP — ソロモード。名指しのモブやスケジュールは捏造しない)
- Construction の具体編成(Unit/Bolt)は Units Generation・Delivery Planning で確定する
- スコープ `amadeus-feature` は walking-skeleton ON — 最初の Bolt は end-to-end スライス(生成スクリプト最小版 → index.html → 目視確認)としてゲートする前提を引き継ぐ
- SKIP された optional 上流(market-research・team assessment 等)の成果物は存在しない — 後続ステージで捏造せず、内部証拠(実測・record 既決)で代替する

## 承認状態

- ステージゲート: 常任グラント 46ef0bc9(phase boundary 込み、ユーザー裁定 2026-07-26)による委任承認
- 都度承認が残る節目: walking-skeleton ゲート、PR マージ

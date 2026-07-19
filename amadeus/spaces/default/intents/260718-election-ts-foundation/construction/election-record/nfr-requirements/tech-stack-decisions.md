# Tech Stack Decisions — election-record(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 選定と根拠

| 領域 | 選定 | 根拠 |
|---|---|---|
| 言語/ランタイム | TypeScript/ESM+Bun 直接実行 | requirements.md NFR-1+codekb technology-stack.md の既存スタック実測 |
| GoA 行互換 | 実 parseGoaLine(packages/framework/core/tools/amadeus-norm-metrics.ts:688)を round-trip テストで in-process import | requirements.md FR-5a 受け入れ「parseGoaLine が round-trip で parse できることをテストで固定」— 自前パーサ複製は二重実装(org.md Forbidden 同族)につき不採用。関数 import は CLI 直実行ではないため no-canonical-direct-execution の対象外 |
| 型設計 | branded GoaLineCode+判別ユニオン Result | E-ETF-FD2 Q3=A 裁定+project.md functional-domain-modeling-ts 既決(business-logic-model.md と一致) |
| lint/型検査/テスト | Biome+tsc+bun test(既存配線) | ADR-1 Consequences — 新規配線なし。純関数検査は unit 層、実 parseGoaLine import の round-trip も fs 非依存につき unit 層(fs-tests-integration-first の2軸 — in-process=計測軸/層=配置軸) |

## 却下した代替

- parseGoaLine 互換の自前検証パーサ複製 — 意図の同一な二重実装であり、スキーマ変更時に分裂する(意図ベースの重複排除)。実関数 import が唯一の正
- GoA 行スキーマの拡張(複節コード対応等)— requirements.md NFR-4 が明示禁止(変更が必要になったら実装前停止→裁定)。既存 corpus のハイフン複節コード非可視問題は E-ETF-FD2 Q3 裁定の付帯事項として leader へ起票を依頼済み(起票の着地確認は本ステージ gate 報告で実施 — 本文書は Issue 番号を先取り記載しない)

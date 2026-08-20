# Stage Diary — units-generation

## Interpretations

- 2026-08-20T12:58:00Z — 質問は 0 問と判定: unit 分割(4 unit、1 Issue = 1 Unit)・依存(2辺)・規模・write scope は intent-capture Q4 / scope-definition Q1 / AD ADR-1〜3 で全て裁定済みで、材料となる未決事項が存在しない(ステージ本文の「exceptionally clear」条件に該当)。questions ファイルは produces に含まれないため作成しない。
- 2026-08-20T12:58:00Z — user-stories SKIP のため story-map は FR ↔ Unit trace として作成(story 単位の写像は不在が設計どおり)。

## Deviations

## Tradeoffs

- 2026-08-20T12:58:00Z — FR-REG-5 は2 unit 分割(U1 前半 / U4 後半)のまま維持 — 単一 unit へ寄せると循環(ADR-1 実測)か交差が再発するため。

## Open questions

## §12a 記録

- 2026-08-20T13:08:00Z — iteration 1 NOT-READY(BLOCKER 1 = 生成台帳の共有書込面)→ 是正(全 unit へ台帳宣言 + 非交差主張の精密化 + model-map ピン実測)→ iteration 2 READY(complete-review exit 0)。FD/DP への申し送り: 台帳クラス別解決手順(patch-allowlist は再アンカー)、t3078 述語方向の実読と U1 の plugin.json 条件付き scope、U3 の RFC 条件付き scope、deployment model 語彙、AD 2面の tla-authoring.ts 未追随記録。

## §13 記録

- 2026-08-20T13:12:00Z — §13 選挙 E-260820-FMC-UG-S13 が 2-0 established「台帳交差の織り込み則を採用」(GoA 2/2、両票の留保を本文へ反映)。persist 実行済み(project.md ## Corrections、RULE_LEARNED 1件)。c1/c2/c3 は不採用。

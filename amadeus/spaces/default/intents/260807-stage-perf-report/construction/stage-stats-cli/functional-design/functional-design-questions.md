# Functional Design — 質問票(unit: stage-stats-cli)

- **Intent**: `260807-stage-perf-report`
- **Stage**: functional-design (3.1 / CONSTRUCTION)
- **Mode**: chat(質問 0 件 — 下記判定)

## 質問しない事項(既決 — 前提として成果物へ反映)

Construction の質問は例外的(stage-protocol §3)であり、`cid:intent-capture:c1` に基づき既決事項は質問しない。本ステージの質問は **0 件**:

- アルゴリズム(窓構成・idle 減算・p95・2 段マッチ): requirements FR-1〜FR-7 の AC が仕様レベルで固定済み
- ドメインモデル: application-design component-methods.md が主要型(AttributedRecord / StageWindow / MeasuredWindow / ExclusionCounts 等)を確定済み
- エラー処理: component-methods.md「エラー処理方針(per-component)」節+ADR-6(除外バケット)で確定済み
- 統合点: component-dependency.md(`amadeus-journal.ts` のみ・read-only)で確定済み
- フロントエンド: 非該当(kind=service、UI なし — frontend-components.md は produces_kinds により本 unit へ不適用)

## 裁定の記録

- 質問 0 件の判定根拠: 全焦点領域が承認済み上流成果物(requirements・application-design 5 点)から一意に確定(E-OC1 判定種別: 承認済み上流による既決)。
- ユーザー承認: 2026-08-07T22:16:16Z(functional-design ゲート承認 — 質問 0 件判定・§12a iteration 2 READY・§13 選挙 E-SPR-FDS13 の c1 採用裁定を含む)

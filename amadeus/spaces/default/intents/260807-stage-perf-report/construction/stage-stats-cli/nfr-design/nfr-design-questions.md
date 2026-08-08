# NFR Design — 質問票(unit: stage-stats-cli)

- **Intent**: `260807-stage-perf-report`
- **Stage**: nfr-design (3.3 / CONSTRUCTION)
- **Mode**: chat(質問 0 件 — 下記判定)

## 質問しない事項(既決 — 前提として成果物へ反映)

Construction の質問は例外的であり、`cid:intent-capture:c1` に基づき既決事項は質問しない。本ステージの質問は **0 件**:

- NFR の数値・機構: requirements.md NFR-1〜NFR-5 が実測ベースで固定済み(nfr-requirements ステージは本スコープで SKIP — 不在は設計上の欠落であり、requirements.md の NFR 節を代替正本とする)
- 常駐サービス向けセレモニー(cache / horizontal scaling / circuit breaker)の不適用: `cid:nfr-design:c1` が CLI への機械的適用を禁止 — 決定的なファイル境界と fail-closed 契約へ置き換える(既決ノルム)
- テスト配置・被覆機構: NFR-2(twin 分割)/ NFR-3(in-process seam)は ADR-5 で設計済み

## 裁定の記録

- 質問 0 件の判定根拠: 全事項が requirements.md NFR 節・ADR-5・既決ノルム(nfr-design:c1)から一意に確定(E-OC1 判定種別: 承認済み上流・既決ノルムによる既決)。
- ユーザー承認: 2026-08-07T22:25:38Z(nfr-design ゲート承認 — 質問 0 件判定・§12a iteration 1 READY・§13 選挙 E-SPR-NDS13 の 0 件裁定を含む)

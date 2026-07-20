# RAID Log — upstream-sync-230

上流入力(consumes 全数): intent-statement(`../intent-capture/intent-statement.md`)

## Risks(リスク)

| ID | リスク | 影響 | 緩和 |
|---|---|---|---|
| R1 | stage-schema 拡張が全6ハーネス dist へ波及し drift 赤を誘発 | 中 | 各 Bolt で dist:check / promote:self:check 必須(検証契約) |
| R2 | プラグイン機構の再実装が想定より大規模化 | 中 | 独立 construction スライス化+walking-skeleton 規律で最初の Bolt を最小 end-to-end に |
| R3 | MEDIUM confidence 4項目(swarm-batch-advance / gate-next-stage-naming / help-routing / kiro-ide-hook-context)が実測で EQUIVALENT/相違と判明 | 低 | inception で検証先行 — スコープ縮小方向のリスクであり工数超過ではない |
| R4 | kiro-ide hook context の実機検証手段が限定的(Kiro IDE 上のみ) | 中 | アダプタ単体テスト(upstream t218 相当)+fail-open 設計の維持 |
| R5 | park 長期化により再開時に main が前進し計画の local evidence が陳腐化 | 低 | 再開時に comparison_commit からの diff 再実測(base-advance-regrounding の計画版)を再開手順に明記 |

## Assumptions(前提)

| ID | 前提 | 検証状態 |
|---|---|---|
| A1 | upstream タグ v2.2.0/v2.3.0 は不変(SHA 固定済み: eae912e0… / 29a31f78…) | 実測済み(本セッション、git ls-remote+fetch) |
| A2 | 承認済み計画(ledger 8/8 APPROVED)が実装スコープの正本 | 成立(2026-07-20T04:48:20Z) |
| A3 | upstream 設計は Amadeus の6ハーネス manifest 構成へ一般化可能(packager は manifest 由来投影) | 高確度の仮説 — application-design で確定 |
| A4 | 実装再開時もチームモード規範(選挙・グラント・Bolt PR)が有効 | 前提(変更時は再開時に再確認) |

## Issues(顕在化した問題)

| ID | 問題 | 状態 |
|---|---|---|
| — | なし(本 intent 起点のオープン Issue は現時点でゼロ) | — |

注: 前 intent の RAID 引き継ぎは非適用 — 本 intent は upstream-sync 計画を唯一の入力とする新規系譜で、直前 intent(260719-mirror-productization 等)の RAID 項目と依存関係を持たない(feasibility:c2 の再実測義務は「引き継ぐ場合」に発火するため対象外)。

## Dependencies(依存関係)

| ID | 依存 | 方向 |
|---|---|---|
| D1 | stage-schema-extensions(D6 root)→ packager-plugin-projection → compose-hook → test-pro / plugin-docs | 実装順序(計画 D6) |
| D2 | unit-kind-pruning は stage-schema-extensions と同一スキーマ面 — 同時期に設計 | 実装順序(計画 D2) |
| D3 | bolt-dag-selfheal → swarm-batch-advance 検証(unit list 読みを共有) | 実装順序(計画 D1) |
| D4 | ledger 遷移: PLANNED → INTENT_IN_PROGRESS(実装開始時)→ APPLIED(全検証 green 後) | プロセス(計画 Ledger transition contract) |
| D5 | construction 進入 ← ユーザーの park 解除承認 | プロセス(user decision) |

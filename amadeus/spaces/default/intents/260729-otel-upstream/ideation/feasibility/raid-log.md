# RAID Log — OTel Upstream 統合

上流入力（consumes 全数）: `intent-statement.md`（参照済み）、`competitive-analysis.md`（不存在）、`market-trends.md`（不存在）、`build-vs-buy.md`（不存在）

## Risks

| ID | リスク | 影響度 | 確率 | 対応 |
|---|---|---|---|---|
| R-1 | `@opentelemetry/context-async-hooks` が Bun で動かず、自前 Context Manager 実装が必要になる | 大（工数増） | 中 | Phase 1 の最初の検証項目に設定。不成立は不合格条件ではなく Adapter 実装へ切替 |
| R-2 | OTel Logs API の Development stability により、upstream 変更で API 形状が壊れる | 中 | 中 | version pin と追従方針を Phase 1 ADR で確定。独自 EventRecord Interface の退路を保持 |
| R-3 | 約1600 call site の移行で新旧実装の振る舞いがずれる（drift） | 大 | 中 | shadow 比較＋機械可読 report、call-site guard の CI 追跡、削除ゲートで制御（#1672 移行設計） |
| R-4 | 同期 I/O（lock＋sync append）が hot path で性能予算を超過する | 中 | 低 | 現行と同等の仕組みのため回帰リスクは低い。Phase 1 で cold/warm 実測 |
| R-5 | 例外を握りつぶす中間層経由で canonical 書き込み失敗後に状態遷移が進む | 大 | 低 | 失敗契約の二重防御（fatal health latch）を Phase 1 のテスト先行順序の1番目で固定 |
| R-6 | 全 harness 生成面への Provider/Exporter 同期漏れ | 中 | 中 | distribution drift guards を削除ゲートに含有（#1672） |

## Assumptions

| ID | 前提 | 根拠 | 無効化条件 |
|---|---|---|---|
| A-1 | **仮説**: `@opentelemetry/context-async-hooks` が Bun で動作する | Bun の AsyncLocalStorage 対応 | Phase 1 検証で不成立が判明 |
| A-2 | **仮説**: OTel Logs API 採否はどちらの案でも walking skeleton で実装可能 | 独自 Provider が依存するのは API 形状のみ | Phase 1 で両案とも許容不能と判明（＝initiative 撤回） |
| A-3 | bundle への依存取り込みで単一 bundle・API singleton が成立する | Q3 回答、bun build の仕組み | Phase 1 の bundle 検証で不成立 |
| A-4 | 既製 Projector の縮退で Relay 機能（cursor・idempotency・retry）が再利用できる | #1672 移行設計 | Phase 6 で再利用不能と判明 |

## Issues

| ID | 課題 | 状態 |
|---|---|---|
| I-1 | Phase 1 ADR の未決事項4点（Logs API 採否・version pin、Bun Context Manager、Journal health 検証 protocol、API singleton bundle 構成） | open — #1678 に記載済み、Phase 1 で確定 |
| I-2 | audit CLI append verbs の公開互換方針 | open — Phase 4 ADR で決定（#1672 移行設計どおり） |

## Dependencies

| ID | 依存 | 種別 |
|---|---|---|
| D-1 | #1672（親 Issue、設計レビュー済み）の採用方針・失敗契約・移行設計 | 設計前提 |
| D-2 | #1678（Phase 1 walking skeleton）— hard gate。後続 Phase は合格が前提 | 実行順序 |
| D-3 | 既存 audit Journal（schema v1）と reader 群 — v1/v2 mixed 期間の後方互換 | 技術依存 |
| D-4 | 既存 drift guard 基盤（distribution、scope-table 等）— Event Registry guard はこの上に追加 | 技術依存 |

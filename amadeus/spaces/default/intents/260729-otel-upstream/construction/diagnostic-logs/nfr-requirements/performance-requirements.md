# Performance Requirements — U10: diagnostic-logs

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## 目標

| 項目 | 目標 | 測定方法 |
|---|---|---|
| emit レイテンシ | `emitDiagnostic` は現行 telemetry buffer 書込（`<record>/.amadeus-otel/buffer-*.jsonl` への O_APPEND 1 行、technology-stack.md 実測）と同型の 1 回の同期 append のみ行い、それ以外の I/O・timer を持たない。数値予算は Phase 1 実測後に ADR で確定（Q2-A） | 呼出し側関数内で発生する FS 操作回数を実装検査＋p50/p95 を現行 buffer 書込と比較 |
| batch 禁止 | batch timer・flush なし。emit 完了時に同一 process の reader から即時観測可能（BR-8、FR-JRN-3 の Store 版） | emit 直後 read 検証テスト |
| fail-open 遅延 | Store 書込失敗時の復帰は例外握りつぶしのみ。retry・queue・二次 emit を行わない（BR-2・BR-10）ため、失敗経路の追加遅延は catch 処理の定数時間に留まる | 強制失敗テストで復帰までの追加操作がないことを固定 |
| 相関採取コスト | traceId／spanId は active Context からの参照取得のみ（ID 生成・sha256 計算・Span 終了待ちを行わない、BR-3） | 実装検査（emit 経路に ID 生成がないこと） |

## 「1 回の同期 append」の明確化（申告付き追記）

上表「emit レイテンシ」の「1 回の同期 append のみ」は、**record あたりの append 書込が 1 回・同期・バッファ／タイマー／リトライ経路なし**を指す。`mkdirSync` 等の**冪等な ensure-dir セットアップ FS 操作は append に数えない**。

- 根拠: U4 hardening 済み `local-log-exporter.ts` の `defaultWrite` は `mkdirSync(recursive)` + `appendFileSync` の 2 FS 操作で構成される（実測）。BR-11 により本 Unit は当該 Exporter を複製・改変しないため、U4 実装を正とし要件表現を明確化する
- 検証の対応: 注入 seam 経由の append 呼出し回数 = 1 と、emit 経路の timer 不在（静的検査）で固定する（`tests/integration/t368-diagnostic-logs.test.ts`）
- 出典: 2026-07-30 conductor 執行裁定（U10 builder の観測 → U4 `defaultWrite` 実測による裁定。U4 コードは無改変）

## 制約

- hot path にネットワーク I/O・Collector 依存を導入しない（FR-EXP-2 系統、NFR-2 準拠）
- diagnostic 経路の計測結果は Phase 1 ADR の数値予算の入力とする（NFR-1・Q2-A）

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T09:51:48Z
- **Iteration:** 1
- **Scope decision:** none

READY: all 12 BRs and unit-relevant NFR/VER IDs covered; targets quantified or deferred per Q2-A; FR-DST-2 recorded.

### Findings

- None

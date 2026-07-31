# Performance Requirements — U1: otel-walking-skeleton

上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`（すべて参照済み）

## 目標（NFR-1 準拠）

| 項目 | 目標 | 測定方法 |
|---|---|---|
| canonical Event の sync append レイテンシ | 現行 `appendAuditEntry` 同等を上回る回帰なし（比較基準）。数値予算は Phase 1 計測後に ADR で確定 | cold（lock 初期状態）／warm（連続 append）の p50/p95 を skeleton 内で計測し現行と比較 |
| emit → reader 観測可能性 | 同一 process 内で emit 完了時に即時読取可能（FR-JRN-3） | emit 直後の read 検証テスト |
| bundle size | Bun-only 単一 bundle が成立し、OTel 依存の取込後も自己完結（NFR-3） | bun build 成果物の size 計測＋起動検証 |
| 起動オーバーヘッド | Provider 登録が CLI 起動時間に有意な遅延を加えない（数値閾値は Phase 1 計測後に ADR で確定） | 代表 CLI の起動時間を Provider 有無で比較 |

## 制約

- hot path（tool 呼出し等）で新たなネットワーク I/O・バッチ待ちを導入しない（NFR-2）
- 計測結果は Phase 1 ADR の入力とし、予算超過なら hard gate の不合格条件とする

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T09:03:40Z
- **Iteration:** 1
- **Scope decision:** none

NOT-READY: coverage consistent and decisions match, but FR-DST-2 orphaned from all five NFR docs, startup-overhead target vague without explicit deferral, tech-stack-decisions.md below required-sections shape.

### Findings

- MINOR tech-stack-decisions.md: FR-DST-2 (package/promote regeneration + drift guards) referenced nowhere in the five NFR docs — add a row stating core/otel/ addition requires manifest mapping, package.ts regeneration, and passing package.ts --check/promote:self:check, citing FR-DST-2/BR-14
- MINOR performance-requirements.md row 4: '有意な遅延' unquantified without explicit deferral — append the same deferral clause as row 1 (数値閾値は Phase 1 計測後に ADR で確定)
- MINOR tech-stack-decisions.md: only one H2 heading — add an H2 (e.g. ## 決定) above the decision table

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T09:06:00Z
- **Iteration:** 2
- **Scope decision:** none

READY: all 3 iteration-1 findings verified fixed (配布 row for FR-DST-2/BR-14, startup-overhead deferral, ## 決定 H2); passing criteria re-verified.

### Findings

- None

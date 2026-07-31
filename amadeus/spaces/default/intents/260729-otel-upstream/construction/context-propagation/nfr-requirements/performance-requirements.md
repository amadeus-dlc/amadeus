# Performance Requirements — U5: context-propagation

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

## 目標

| 項目 | 目標 | 測定方法 |
|---|---|---|
| env 注入コスト | `injectToSubprocess(env)` が subprocess 起動前処理へ加える遅延は実測で検出不能レベルであること（数値閾値は Phase 1 計測後に ADR で確定、Q2-A） | 注入有無で hook／sensor 起動の wall time を比較計測 |
| env 抽出コスト | 子 process 起動時の Context 抽出が起動時間へ有意な遅延を加えない（数値閾値は Phase 1 計測後に ADR で確定） | 代表 hook process の起動時間を抽出有無で比較 |
| Intent Context 復元 | `restoreIntentContext(intentId)` は record 配下ファイルの 1 回 read で完結し、network I/O・lock 待ちを持たない | read 回数・所要時間をテストで固定 |
| carrier サイズ | 注入する env は `traceparent`（55 bytes 固定）＋ `tracestate`（W3C 推奨の 512 bytes 以内）のみで、注入 env 合計は 1 KiB 未満 | 注入後の env 値サイズをアサート |

## 制約

- env 注入・抽出・永続化・復元の hot path で network I/O・batch 待ち・外部 process 呼出しを導入しない（NFR-2 と整合）
- 計測結果は Phase 1 ADR の入力とし、数値予算はそこで確定する（Q2-A）

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T09:51:48Z
- **Iteration:** 1
- **Scope decision:** none

NOT-READY: coverage/BR-consistency/structure/FR-DST-2 pass; one MINOR internal inconsistency in the carrier-size target (1 KiB vs W3C 512-byte recommendation).

### Findings

- MINOR performance-requirements.md carrier サイズ row: '増えても 1 KiB 未満' contradicts 'W3C 上限 512 bytes 推奨内' (tracestate cap) — split the bounds (tracestate ≤512B per W3C; total injected env <1 KiB) or hold 512B as the hard target

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T09:54:17Z
- **Iteration:** 2
- **Scope decision:** none

READY: iteration-1 MINOR carrier-size contradiction verified fixed (bounds split: tracestate ≤512B per W3C, total env <1 KiB); iteration-1 passing criteria re-verified.

### Findings

- None

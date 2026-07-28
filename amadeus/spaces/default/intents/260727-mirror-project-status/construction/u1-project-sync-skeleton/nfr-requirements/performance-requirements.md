# Performance Requirements — u1-project-sync-skeleton

上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

本ユニットは常駐サービスを持たない CLI(technology-stack: Bun/TypeScript ESM、外部到達は gh CLI サブプロセスのみ)であり、性能要件はレイテンシ SLO ではなく **API 呼び出し回数予算と既存 deadline profile** で規定する(cid:nfr-design:c1 — CLI への機械的な cache/scaling 適用をしない)。

## 呼び出し回数予算(requirements NFR-3 の U1 適用)

- `listProjectItems` は boundary あたり **1回**(全 Project 分の一括照会 — business-logic-model の直線経路)。
- Project あたり上限: `resolveProjectStatusField` **1回**+mutation **≤2回**(未所属の対象 Project: addProjectItem 1+updateProjectItemStatus 1 / それ以外: updateProjectItemStatus ≤1 — 既一致なら 0。business-rules BR-U1-6 の no-op 冪等)。
- 検証: FakeGateway の history 検査で per-Project 呼び出し回数上限を assert(NFR-3 受入基準)。実時間の負荷試験は行わない(cid:build-and-test:bt-timeout-verification-shape — counter assertion で構成)。

## 実行時間の境界

- gh サブプロセスは既存 runner の deadline/stdout cap をそのまま使う(実装直読: amadeus-mirror-runner.ts:29 `single: { deadlineMs: 30_000, stdoutLimitBytes: 1 * MiB }` — 30秒/1MiB の named constant)。新しいタイムアウト機構・throttle を導入しない(requirements NFR-3 後段)。
- rate-limit(429)は既存 retryable 分類で吸収する — U1 では警告+継続(pending 台帳収束は U2 責務)。

## 非目標

- レスポンスタイム SLO・スループット目標: 実在する常駐サービス/SLI が無いため N/A(根拠: requirements FR-1b — 同期は既存 boundary / manual チェーン内でのみ実行し daemon・polling・GitHub Actions を導入しない = CLI 単発実行のみ。cid:observability-setup:c3 の N/A 規律)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T08:40:48Z
- **Iteration:** 1
- **Scope decision:** none

上流ヘッダ・BR/FR 引用・U1 責務境界は正確だが、性能中核数値 30s/1MiB が宣言 consumes に無く consumes 外 services への装飾的言及のみで根拠付け(constants-from-code 違反、Major)。N/A 根拠3箇所の引用先も弱い(Minor)。

### Findings

- [Major] performance-requirements.md / tech-stack-decisions.md の deadline/stdout cap(30s/1MiB)に file:line 引用なし — 宣言 consumes 4件の grep 全数で数値の出現 0(constants-from-code 違反)
- [Minor] SLO/スケーリング N/A の根拠3箇所が technology-stack のプロセスモデル記述(実在しない)を引用 — FR-1b(consumes 済み)を引用先にすべき

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T08:42:52Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の2件は実測で閉包 — runner.ts:29 の named constant 引用が実装と一致、N/A 根拠は FR-1b 実文が支持。是正による新規矛盾なし。

### Findings

- None

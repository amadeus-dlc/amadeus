# Units of Work — OTel Upstream 統合

上流入力（consumes 全数）: `components.md`、`component-methods.md`、`services.md`、`component-dependency.md`、`decisions.md`、`requirements.md`（すべて参照済み）

Unit 境界戦略: コンポーネント／要件群アライン（Q1-A）。トポロジのみを記述し、実装順序・優先度は delivery-planning で決定する。デプロイモデルは全 Unit 共通で「正本 `packages/framework/core/` への組み込み（embedded）— package/promote で全 harness 生成面へ同期」。

## U1: otel-walking-skeleton（L）

- **責務**: #1678 の合格条件全体。Tracer／Logger／Meter Provider bootstrap、Local Exporters の最小実装、失敗契約（例外＋fatal latch）、Context 維持・分離検証、単一 bundle 成立、sync I/O cold/warm 計測、テスト先行順序（失敗契約→Context→Exporter 契約→shadow 比較ハーネス原型）
- **境界**: `packages/framework/core/otel/` の新設と代表接続（1 CLI・1 hook・1 subprocess のみ）。本番 call site の一括変更は行わない。不合格なら撤回できるよう現行 Projector 経路は維持
- **所有要件**: FR-EXP-1/6, FR-EVT-2（emit 経路）, FR-EVT-3/4/5/6, FR-TRC-2/3, FR-DST-1, FR-DST-2（harness manifest への otel/ マッピング）, NFR-1/2/3, VER-3
- **制約**: hard gate。この Unit のゲート承認が全後続 Unit の前提

## U2: event-registry（M）

- **責務**: 78 語彙の型付き Event Registry（canonical/telemetry 分類・required attributes・schema version）と drift guard（compile-time・unit test・sensor での4集合一致検証）
- **所有要件**: FR-EVT-1, FR-EVT-7, VER-1
- **依存**: U1（Provider 経由の emit 経路が前提）

## U3: journal-v2（M）

- **責務**: Journal schema v2 codec、v1/v2 reader、mixed shard merge、converter、human-readable View/pretty-print
- **所有要件**: FR-JRN-1, FR-JRN-2, FR-JRN-5
- **依存**: U1

## U4: local-exporters（M）

- **責務**: AuditLogExporter・LocalSpanExporter・LocalLogExporter・LocalMetricExporter の本番実装（U1 の最小実装を hardening）。redaction 二層（write-time＋export 境界）
- **所有要件**: FR-EVT-2（dispatch 先）, FR-EXP-2, FR-EXP-3, FR-EXP-4, FR-EXP-5, FR-JRN-3, FR-DST-3, FR-DST-4, FR-DST-5, VER-2
- **依存**: U1, U2（Registry による受理集合の検証）, U3（schema v2 codec の利用）

## U5: context-propagation（M）

- **責務**: W3C Trace Context の子 process／subagent／hook への伝播、Intent Trace Context の永続化／復元と remote parent 接続
- **所有要件**: FR-TRC-4, FR-TRC-5
- **依存**: U1

## U6: journal-reader-swap（M）

- **責務**: doctor／recovery／presence／grant／merge／runtime graph／learnings の共通 reader 差替え（v1/v2 両対応）
- **所有要件**: FR-JRN-4
- **依存**: U3（v1/v2 reader が前提）

## U7: callsite-migration（L）

- **責務**: 約1600 call site の段階移行（互換 Adapter 経由）、call-site guard（直接呼出し・旧 observe 利用の CI 拒否と残存可視化）
- **所有要件**: FR-MIG-1, FR-MIG-2, VER-4
- **依存**: U4（emit 先の本番 Exporter が前提）

## U8: legacy-writer-removal（M）

- **責務**: `appendAuditEntry()` 旧 writer 削除、削除ゲート全条件（mixed Journal 動作・registry 完備・call site ゼロ・shadow 比較同等・Relay 非生成証明・distribution guards）の機械検証
- **所有要件**: FR-MIG-2, FR-MIG-4, FR-MIG-5
- **依存**: U7

## U9: metrics-subset（S）

- **責務**: Counter／Histogram subset の Meter Provider 実装と Metric Store 出力
- **所有要件**: FR-MLM-1, FR-EXP-5
- **依存**: U1, U4（hardened LocalMetricExporter の利用）

## U10: diagnostic-logs（S）

- **責務**: diagnostic Logs の LocalLogExporter 出力と Trace Context 相関
- **所有要件**: FR-MLM-2, FR-EXP-4
- **依存**: U1, U4（hardened LocalLogExporter の利用）

## U11: otlp-relay（M）

- **責務**: 旧 Projector の縮退（意味生成削除、Store 読取・OTLP 変換・cursor・retry・retention）、session-end trigger の再定義、shadow 比較の撤収
- **所有要件**: FR-RLY-1, FR-RLY-2, FR-RLY-3, NFR-4, VER-5
- **依存**: U7（shadow 比較は移行期間に実施し、同等以上の確認後に縮退）

## 実装上の共通制約

- 正本は `packages/framework/core/`（`decisions.md` ADR-4）。`amadeus-lib.ts` へは追加しない
- コメントは英語、テストは同一コミットで red-green（`team-practices.md` ## Testing Posture）
- 各 Unit は worktree 分離の Bolt として実装可能（`team-practices.md` の solo-bolt-worktree-required）

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T07:44:18Z
- **Iteration:** 1
- **Scope decision:** none

NOT-READY: FR-EVT-2, FR-DST-2, NFR-4 orphaned; YAML DAG omits real coupling edges (U4→U3, U9/U10→U4); minor: FR count wrong (33→39), order leak in U3, FR-JRN-3 ownership, U1/U2 complexity underestimated.

### Findings

- MAJOR story-map/unit-of-work: FR-EVT-2 (canonical emit dispatch) has no owning unit — map to U1 (emit path) and U4
- MAJOR story-map/unit-of-work: FR-DST-2 (package/promote regeneration + drift guards) has no owning unit — assign manifest mapping to U1 and keep VER-6 as cross-cutting
- MAJOR story-map/unit-of-work: NFR-4 (OTLP no-auth local collector) has no owning unit — map to U11
- MAJOR unit-of-work-dependency: YAML DAG omits coupling edges — U4 uses U3's schema v2 codec; U9/U10 consume U4's hardened LocalLog/Metric exporters — add U4→U3, U9→U4, U10→U4
- MINOR story-map: 'FR 33件' wrong — actual 39
- MINOR unit-of-work U3: implementation-order leak ('U4 の v2 writer より先に導入') — make topology-neutral (the new U4→U3 edge captures it)
- MINOR story-map/unit-of-work: FR-JRN-3 (emit-complete observability) is the AuditLogExporter contract — move from U3 to U4
- MINOR unit-of-work: complexity underestimated — U1 M→L, U2 S→M

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-29T07:48:30Z
- **Iteration:** 2
- **Scope decision:** none

READY: all 8 iteration-1 findings verified fixed; DAG re-validated (11 units, acyclic with new edges, prose≡YAML), zero orphan requirements/units, no order/critical-path language.

### Findings

- None

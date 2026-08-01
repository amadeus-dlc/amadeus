# Code Generation Plan — otlp-relay

上流入力（consumes 全数）: functional-design（business-logic-model.md、business-rules.md、domain-entities.md）、nfr-requirements（performance / reliability / scalability / security / tech-stack-decisions）、nfr-design（logical-components / performance / reliability / scalability / security）（すべて参照済み）

## 対象要件

U11（unit-of-work.md）: Projector が Relay に縮退し、Relay が Journal から Span を生成しないことのテスト証明がある（FR-RLY-1/2）。

## 前提裁定

- **E-U11RLY**（2026-07-31、案A 採用 2-0）: U11 で旧 Projector（tools/amadeus-otel-projector.ts）を削除し、同一 PR で削除ゲートの MIXED_JOURNAL_TESTS から t366 を外し、t366・t358×2 を削除する。条件 (a) の意味論は t365 が単独保持。投票者留保4点（session-end 再配線 / projector allowlist エントリ除去 / U8 越境の申告 / t358 挙動契約の同等証明対応表）を同一 PR で必須とする。
- **conductor 裁定（執行クラス）**: 削除ゲート measureRelayProof の絶対/相対パス不整合（Issue #1783、(e) 恒久 UNKNOWN の原因）の3行修正を、2つ目の申告付き越境として同一 PR へ同乗承認。

## 実施方針

- `packages/framework/core/otel/relay.ts` 新設: Local Signal Store（spans-/metrics-/logs- JSONL）を cursor 以降から読み OTLP へ写像・best-effort 送信、送達分のみ cursor 前進（at-least-once）。Journal の再構築・時刻包含・ID 生成・timing event 合成は持たない。
- lock（BR-9、非待機・stale 再取得）/ 重複追跡（BR-8）/ retention（BR-11、送達済みのみ compaction）/ diagnostics（BR-10、status code+種別のみ）。
- **export 境界 redaction**（Mandated / FR-DST-3）: 送出直前に attributes・event/link attributes を redactAttributes、resource 値を scrubCredentials へ。
- session-end の本番 spawn を relay.ts flush へ再配線。
- TDD（7スライス Red→Green）。FR-RLY-2 は欠陥注入の落ちる実証を必須とする。

## 検証計画

- t372（Relay 本体 integration）/ t373（FR-RLY-2 非生成証明）/ t374（OTLP 写像 unit）/ t375（実 loopback Collector e2e）
- typecheck・lint・dist:check・promote:self:check・coverage:ci・patch gate・complexity-gate・deletion-gate --check

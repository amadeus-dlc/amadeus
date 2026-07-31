# Code Summary — U4: local-exporters

上流入力: unit の functional-design / nfr 成果物（全数参照済み）。

## Files created

- `packages/framework/core/otel/local-log-exporter.ts` / `local-metric-exporter.ts` / `local-span-exporter.ts`（本番化）: fail-open store・完全 field set（span links 記録、log body slot）・export 境界 redaction（FR-EXP-3/4/5、BR-5/7）
- `tests/integration/`: audit v2 exporter・credential-free gate（VER-2 scanForCredentials）・telemetry stores の各 suite
- `tests/unit/`: redaction suite

## Files modified

- `packages/framework/core/otel/audit-log-exporter.ts` — journal schema v2 codec 永続化（appendJournalRecordV2）、registry 検証済み accept set（未登録名 / 必須属性欠落 / telemetry def / 非 v2 を latch なしで拒否）、export 境界 redaction、統一失敗契約（append 失敗 = sync throw + fatal latch）（FR-EXP-2、FR-JRN-3、FR-EVT-2、BR-4/10/13/14）
- `packages/framework/core/otel/redaction.ts` — 二層 redaction: 78-event 必須属性語彙の default-deny キー、Command を safe 層から scrubbed opt-in 層へ、全 admitted 値の credential scrub（scrubCredentials / CREDENTIAL_SCRUB_PATTERNS）（FR-DST-3/4/5）
- `packages/framework/core/tools/amadeus-audit.ts` — appendJournalRecordV2 locked append（lock → seq → v2 encode → sync append、#1248 post-complete stop 継承）
- `packages/framework/core/tools/amadeus-lib.ts` — tryParseJournalRecord の v2 → v1 正規化（Event 属性から v1 event 種別を復元し、既存 auditBlockField / gate 消費者との mixed shard 互換を維持 — U6 reader swap 着地までの interop）

## Key implementation decisions

- 書込は v2 canonical のみ、v1 event 種別は AuditLogExporter が `Event` 属性として stamp（presence ledger 読者の互換確保）
- emit は isoTimestamp()（秒粒度）で v1 行との誤順序を回避
- 失敗契約: append 失敗は fatal latch へ、accept-set 拒否は latch なし（想定内 fallback を fatal に流さない — Forbidden 準拠）
- dry-run encode を I/O 前に実施（malformed record の事前拒否）

## Test coverage summary

- PR #1719 CI green（全ブロッキングゲート通過）で otel-improvement へ squash merge 済み（fe2e0480c）
- patch coverage gate PASS、typecheck・lint・dist/promote drift 全 green

## Deviations from the plan

- なし（承認済み設計の範囲内。tryParseJournalRecord の interop 正規化は U6 着地までの設計内暫定として実装）

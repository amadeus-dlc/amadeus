# Code Summary — U6: journal-reader-swap

上流入力: unit の functional-design / nfr 成果物（全数参照済み）。

## Files created

- `tests/unit/t365-journal-reader-swap.test.ts`（316行）: v1/v2 バッファの field projection 等価性、journalRecordField の型別正規化、live-exporter 形（eventName=OTel 名 + Event 属性）の回帰
- `tests/integration/t366-journal-reader-swap-projector.test.ts`（233行）: journalSpanInput の v2 正規化（trim・Event 属性優先・v1 素通し・correlation 非合成）

## Files modified

- `packages/framework/core/tools/amadeus-lib.ts` — tryParseJournalRecord を共通 reader（parseJournalLine の v1/v2 dispatch）へ載せ替え、auditBlockField を journalRecordField 経由の正規化 field access に統一。U4 の interop 正規化（インライン v2→v1 変換）は共有 accessor へ吸収して削除
- `packages/framework/core/tools/amadeus-journal.ts` — journalRecordField（FR-JRN-4 正規化 field access）: "Event" は live 行の stamped Event 属性を優先（trim 済み）、convertV1ToV2 行は eventName へ fallback
- `packages/framework/core/tools/amadeus-otel-projector.ts` — journalSpanInput（span-input view）: Event 属性（fallback eventName）→ event、eventName → heading、typed attributes → trim 済み string fields。readJournalEntries が mixed shard を line 単位 decode（malformed shard は fail-open）
- `packages/framework/core/tools/amadeus-migrate.ts` — doctor migration-evidence 読取の v1/v2 decode 対応
- `tests/.coverage-patch-allowlist.json` — 行シフト 2 エントリを機械 remap + 直読照合で再アンカー（amadeus-journal.ts 237→245、amadeus-audit.ts 1045-1047→1083-1085）

## Key implementation decisions

- v2 の trace/span correlation ID は span identity に不使用（Q3/Q10 決定論維持）、v1 の欠落 correlation は許容し edge を合成しない（BR-8/BR-16）
- rebase 時の semantic conflict（base の Bolt 5 exporter は eventName=OTel 名 / Event 属性=v1 event 種別を stamp、当初実装は "Event"→eventName 写像で live 行を全て取りこぼし t188/t31 赤）を、Event 属性優先 + eventName fallback で解消。書き手契約（audit-log-exporter.ts:130）と読み手を canonical 一致させた
- レビュー指摘（Bugbot 91592f69）: journalSpanInput の v2 属性 trim 漏れを journalRecordField と逐語一致の正規化で是正

## Test coverage summary

- t365/t366: 15+ tests green。t188/t31 の回帰も解消（base green → rebase 後赤 → 修正後 green の対照実測）
- フルスイート RESULT: PASS（-P 4）。patch coverage gate PASS（measured 42, covered 42, allowlisted 0, uncovered 0）。project gate OK。typecheck・lint・dist/promote drift 全 green
- PR #1718: origin/otel-improvement へ rebase 済み・MERGEABLE・CI 実行中（マージは人間承認待ち）

## Deviations from the plan

- rebase semantic conflict の解消として journalRecordField / journalSpanInput の "Event" 写像を「Event 属性優先」へ変更（d8156a582）。base 側の書き手契約への機械的整合であり、承認済み設計（正規化 field access）の範囲内

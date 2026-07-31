# Code Summary — U11: otlp-relay

上流入力: unit の functional-design（business-logic-model.md / business-rules.md / domain-entities.md）、nfr-requirements（performance / reliability / scalability / security / tech-stack-decisions）、nfr-design（logical-components / performance / reliability / scalability / security）を全数参照。

裁定: E-U11RLY（案A 2-0 + 留保4点、record: amadeus/spaces/default/elections/260730-e-u11rly/）、conductor 執行裁定（#1783 の3行修正同乗）。

## 着地 PR

- **#1788** feat(otel): Projector を転送専用 OTLP Relay へ縮退（Bolt 10 / U11）

## Files created

- `packages/framework/core/otel/relay.ts` — 転送専用 Relay（742行 + Bugbot 是正）
- `tests/integration/t372-otlp-relay.test.ts` / `tests/integration/t373-relay-journal-non-generation.test.ts` / `tests/unit/t374-relay-otlp-mapping.test.ts` / `tests/e2e/t375-relay-collector-endpoint.test.ts`

## Files deleted（E-U11RLY 案A）

- `packages/framework/core/tools/amadeus-otel-projector.ts`（+ dist 7面 / self-install 5面の投影）
- `tests/integration/t366-journal-reader-swap-projector.test.ts`、`tests/integration/t358-otel-projector.test.ts`、`tests/e2e/t358-otel-otlp-endpoint.test.ts`（挙動契約は t372/t374/t375 へ1対1対応、対象外根拠は PR #1788 本文の対応表）

## Files modified

- `packages/framework/core/hooks/amadeus-session-end.ts` — relay.ts flush への再配線（留保1）
- `tests/deletion-gate.ts` — MIXED_JOURNAL_TESTS から t366 除去（越境1・留保3）+ measureRelayProof のパス相対化3行（越境2・#1783）
- `tests/.coverage-patch-allowlist.json` — projector エントリ除去（留保2）+ 行ピン機械 remap×2回

## Key implementation decisions

- **転送のみ**: Relay は Store record の写像だけを行い、Span の再構築・ID 生成・時刻包含を構造的に持たない。t373 が禁止トークンの構造検査+振る舞い検査で固定（欠陥注入の落ちる実証: 3テスト赤→revert green）。
- **cursor は送達位置**: 送達できた分だけ前進。torn line は行を占めるため「消費行数」で前進（record 数だと取り残しが再送ループ化 — 自己捕捉した欠陥を再現テスト先行で修正)。
- **Bugbot 指摘(実在)を是正**: パース不能行のみが batch を占めると cursor が恒久停止する無音スタック → パース不能行に限り cursor 前進を許可(record にならないため at-least-once を弱めない)、ただし**ファイル末尾の不正行は append 途中でありうるため消費しない**(次回再評価)。スキップ数は全 arm の diagnostics に可視化。
- **(e) UNKNOWN→PASS**: #1783 の3行修正により RELAY_PROOF_MARKER テストが実行可能化(TDD で Red 実測→修正)。

## ゲートへの影響(#1788 着地後)

(a) PASS(t365 単独 12 tests/155 assertions)/ (b) PASS / (c) FAIL 66(残作業)/ (d) UNKNOWN(shadow report 運用待ち)/ **(e) PASS** / (f) PASS → overall BLOCKED(想定どおり)

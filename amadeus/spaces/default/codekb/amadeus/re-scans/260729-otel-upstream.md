# Reverse Engineering Re-scan: 260729-otel-upstream

## スキャン識別子

- `base`: `ca8ff0af40d6250edffe42246d3f5538819c22af`
- `observed`: `22ee27dbef9027203658a6cd98bf97501c4b222c`
- `focus`: OTel/observability upstream イニシアチブ（GitHub #1672）— `amadeus-audit.ts` / `amadeus-journal.ts` / `amadeus-journal-convert.ts` / `amadeus-observability.ts` / `amadeus-otel-projector.ts` の現行構造 + base からの差分
- `date`: `2026-07-29`
- `scope`: `amadeus-feature` / Brownfield / single repo `amadeus`

`base` は前 intent `260728-slop-cleanup` の observed で、`git merge-base --is-ancestor ca8ff0af HEAD` は exit 0（祖先）、`git rev-list --count ca8ff0af..HEAD` = 13。全区間 `git diff --shortstat` = 624 files / +71100 / -26206（生成物・テスト・docs・record 含む）、正本面（`packages/framework/core` + `packages/framework/harness` + `scripts` + `package.json` + `bun.lock`）は 40 files / +4433 / -1559。

## 確定事項（focus 面）

1. **focus 面の区間変更は 2 件のみ**で、いずれも前 intent `260728-slop-cleanup` の修正着地分。(a) `amadeus-journal.ts`（236 行）のヘッダコメントが「PR-3 まで未配線」の失効記述から現行 5 消費者を説明する記述へ更新。(b) `amadeus-observability.ts`（325 行）から未使用フィールド `ProcessObservation.registered` が削除され、登録状態は `_processObservation !== null` に一本化。`amadeus-audit.ts`（1094 行）/ `amadeus-journal-convert.ts`（298 行）/ `amadeus-otel-projector.ts`（609 行）は区間無変更（行数は HEAD の `wc -l` 実測）。
2. **journal codec の消費者は import 実測で 5 モジュール**（`amadeus-audit.ts` / `amadeus-state.ts` / `amadeus-lib.ts` / `amadeus-journal-convert.ts` / `amadeus-otel-projector.ts`、`grep -l 'from "./amadeus-journal.ts"'`）。`amadeus-utility.ts` は doctor fix-hint 文字列中の言及のみで import edge ではない。observability seam の消費者は tools 17 + hooks 12 = 29 モジュール。otel-projector の消費者は `hooks/amadeus-session-end.ts` と CLI のみで、Core からの import はゼロ。
3. **`@opentelemetry` 依存はゼロ**（`grep -c opentelemetry package.json bun.lock` = 0/0）。#1672 の置換（audit writer → OTel EventRecord→AuditLogExporter、`observe()`/`observeSubprocess()` → Trace API spans、otel-projector の pure OTLP relay 化）は現 HEAD では未着手。本 scan が固定した断面が後続ステージの diff 基点になる。
4. **上流スキャンとの差異（訂正 1 件）**: Developer サマリの「codec is now wired (PR-3 switchover landed)」は過大な表現 — 配線は base 時点で既に存在し（base 版 `amadeus-audit.ts:8` が codec を import、audit は区間無変更）、区間で変わったのは stale コメントの除去のみ。括弧内記述（stale コメントが除去された）は正確。

## 区間の他面（focus 外、記録のみ）

- mirror-project サブシステム新設: `amadeus-mirror-project-{contract 46, diagnostics 314, executor 486, gateway 344, ledger-reducer 254, reconciliation-reducer 385, verification 483}.ts` + `amadeus-mirror-timestamp.ts`（81）+ `amadeus-mirror-warning-reducer.ts`（91）（`wc -l` 実測）。`amadeus-mirror-executor.ts`（1553 行）/ `amadeus-mirror-gateway.ts`（908 行）/ `amadeus-mirror-lifecycle.ts`（1185 行）の大再編を含む。`amadeus/config.json` 新設（`mirror-projects` キー）。
- 純粋ロジック分離の `amadeus-intent-selection.ts`（168 行）新設。`amadeus-orchestrate.ts`（4257 行、+289）/ `amadeus-lib.ts`（7975 行、+153）/ `amadeus-utility.ts`（6186 行、+91）が対応変更。
- devDependencies から `@xterm/headless` / `node-pty`（連鎖して `node-addon-api`）が削除。`package.json` description の導線案内が `npx` → `bunx` へ更新。

## センサー不適用と代替検証

Reverse Engineering の `required-sections` / `upstream-coverage` / `answer-evidence` は codekb 出力 path で構造的に発火できないため、センサー成功とは記録しない。代替として次を実行した。

- H2 数: 共有 codekb 9 件 + 本 re-scan の全 10 ファイルで H2 ≥ 2（`grep -c '^## '`）
- conflict marker: 全 10 ファイル 0 件
- 現在マーカー: 共有成果物 9 件で `260729-otel-upstream` が各 1 件、旧 `260728-slop-cleanup` の「現在」は 0 件
- Mermaid: `architecture.md` 新節の flowchart / sequenceDiagram 各 1 図を Mermaid `11.12.2` parser で構文検証 PASS。各図の直後にテキスト代替あり

## 配送境界

本 scan が変更するのは共有 codekb 9 件と本 per-intent re-scan のみ。コード、テスト、state、audit、memory、他 intent record は変更しない。#1672 の置換設計は後続ステージ（requirements-analysis 以降）で裁定する。

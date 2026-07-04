# Code Summary: U001-failure-evidence-foundation

## 変更概要

`.agents/aidlc/tools/aidlc-telemetry.ts` を追加し、OpenTelemetry API ベースの core 計装 facade を導入した。

Exporter 未設定時は OpenTelemetry API の no-op default に留まり、network connection、collector、dashboard、background flush worker は作らない。

評価用には `AIDLC_TELEMETRY_TEST_FILE` による JSONL sink を追加し、span、event、metric を決定的に観測できるようにした。

`.agents/aidlc/tools/aidlc-failure-evidence.ts` を追加し、`ERROR_LOGGED` の追加 field、secret redaction、error fingerprint、`.aidlc-hooks-health/*.drops` 集計をまとめた。

`.agents/aidlc/tools/aidlc-lib.ts` の `emitError` は既存の JSON error envelope を維持したまま、`Error detail` と `Error fingerprint` を audit に追記する。

`.agents/aidlc/tools/aidlc-utility.ts` の `doctor` は Hook drops と Telemetry core status を表示し、drop 数と malformed 数を metric として記録する。

`.agents/aidlc/tools/aidlc-orchestrate.ts` は top-level command scope を張り、`next`、`report`、`park` の実行時間と invocation metric を記録する。

`dev-scripts/evals/failure-evidence-foundation/check.ts` を追加し、active workflow の error path、audit shard、doctor 表示、telemetry JSONL、missing drops、malformed drops を検証する。

`package.json` と `bun.lock` に `@opentelemetry/api` と U001 評価 script を追加した。

`tsconfig.json` には Bun の `.ts` import と整合させるため `allowImportingTsExtensions` を追加した。

## 境界

`skills/` と `.agents/skills/` は変更していない。

`.coderabbit.yml` と `.coderabbit.yaml` は変更していない。

`dev-scripts/data/parity-map.json` の `engineFileExceptions` は変更していない。

Collector、dashboard、cloud infrastructure は U001 の範囲外とした。

## 計画からの差分

Telemetry は独自 facade だけではなく、`@opentelemetry/api` を core dependency として採用した。

`doctor` の verbose full history は既存 option がないため追加していない。

Hook drop の full history は標準表示へ出さず、summary と latest reason だけを表示する。

Intent ref の telemetry attribute は U001 では未接続で、command、stage flag、result flag までに留めた。

## 検証結果

`npm run typecheck` は成功した。

`npm run lint:check` は成功した。

`npm run test:it:failure-evidence-foundation` は成功した。

`npm run test:it:engine-e2e` は成功した。

`npm run test:it:all` は成功した。

`npm run diff:check` は成功した。

`aidlc-sensor.ts fire linter --stage code-generation` は主要変更ファイルで成功した。

`aidlc-sensor.ts fire type-check --stage code-generation` は主要変更ファイルで成功した。

`AmadeusValidator.ts . 260704-workflow-failure-observa` は pass した。

`npm run test:all` は `parity:check` で停止した。

`npm run parity:check` は 8 件の engine file hash 不一致で失敗した。

失敗対象には今回変更した `tools/aidlc-lib.ts`、`tools/aidlc-orchestrate.ts`、`tools/aidlc-utility.ts` が含まれる。

同じ parity 失敗には `hooks/aidlc-log-subagent.ts`、既存差分の `aidlc-common/stages/inception/practices-discovery.md`、`knowledge/aidlc-shared/audit-format.md`、`tools/aidlc-state.ts`、`tools/data/stage-graph.json` も含まれる。

方針に従い、parity exception は追加していない。

## 要件対応

R001 は、active workflow の error path で `ERROR_LOGGED`、`Error detail`、`Error fingerprint` が audit shard に残る評価で確認した。

R002 は、`.drops` normal、missing directory、malformed line の評価と doctor 表示で確認した。

R003 は、OpenTelemetry core facade、no-op default、JSONL test sink、doctor metric で確認した。

R007 は、`test:it:failure-evidence-foundation` を `test:it:all` に接続して確認した。

R008 は、`emitError` の JSON error envelope を変えずに audit field を拡張し、既存 `engine-e2e` で確認した。

R009 は、境界確認と parity 結果の記録で確認した。

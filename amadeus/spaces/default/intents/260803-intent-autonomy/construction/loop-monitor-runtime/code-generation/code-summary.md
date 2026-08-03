# Code Generation Summary — loop-monitor-runtime

## 実装結果

- workflow-level manifest を unknown field・重複・不正 threshold・未解決 contribution で fail-closed にする compiler を追加した。決定的な `graphRevision` は transition table と runtime limit を含む。
- immutable / content-addressed delivery と純粋 reducer を追加した。partition、causal predecessor、ignore、cycle prefix/count/epoch、自然退出、bounded pending、重複、古い重複、identity conflict、causal fork を扱う。
- canonical audit event-set を正とし、per-clone Replay Index を通常 resume 用の二次投影として追加した。index の欠落・破損・WAL 残存は明示 repair まで `INCOMPLETE` とし、clone merge は wall-clock ではなく content identity と causal dependency で順序付ける。
- Judge は `LOOP_JUDGE_STARTED` の永続 reservation と commit receipt 由来 permit の後だけ dispatch する。resume は reconcile-first、attested no-effect の redispatch は最大 1 回、effect possible / unknown は `AWAITING_HUMAN` とする。
- Judge result は observation を completion / route より先に記録し、invocation、evidence、constraint、trace、closed route の不一致を conflict にする。
- evidence-bound latch、同一 evidence の短絡、evidence change または verified `HUMAN_TURN` による atomic clear/unpark、live smoke authorization port、status/replay 投影を追加した。
- `LOOP_MONITOR_EVENT_SET_COMMITTED` を canonical audit vocabulary / OTel registry / audit format に追加した。
- 共通 Core 3 ファイルを Claude Code、Codex、Cursor、OpenCode、Kimi Code の 5 harness へ同一 bytes で投影した。

## 主なファイル

- `packages/framework/core/tools/amadeus-loop-monitor.ts`
- `packages/framework/core/tools/amadeus-loop-monitor-runtime.ts`
- `packages/framework/core/tools/amadeus-loop-monitor-replay.ts`
- `tests/unit/t426-loop-monitor.test.ts`
- `tests/unit/t427-loop-monitor-runtime.test.ts`
- `tests/integration/t426-loop-monitor-replay-index.integration.test.ts`
- `tests/integration/t427-loop-monitor-five-harness-projection.integration.test.ts`

## 検証結果

- Focused test: 60 tests 中 60 pass（compiler/reducer、Judge/latch、Replay Index、audit registry、5 harness projection）。
- `bun run typecheck`: pass。
- `bun run lint`: pass。既存警告に加え、新規 Loop Monitor の cognitive-complexity warning は残るが error は 0。
- `bun scripts/package.ts` と `bun scripts/promote-self.ts --apply` で投影を生成し、5 harness byte-parity test で対象差分の整合を確認した。
- `bun scripts/package.ts --check`: fail（598 件）。対象 5 harness の Loop Monitor file は一致し、失敗範囲は既存 Pi / harness-capability / harness / swarm / stage-graph と、スコープ外として除外した Kiro 投影。
- `bun run promote:self:check`: fail（34 件）。失敗範囲は既存 Claude harness 3 ファイルと Pi formal-model-check 投影。

## 計画との差分・既知事項

- repository 既存 source に未投影の Pi / harness capability / swarm / Kiro 系 drift があったため、Issue #2095 の 5 harness 投影へスコープを限定し、それらの生成差分は commit から除外した。全 package drift check はこの既存 drift を報告し得る。
- `bun run test:ci` は code-generation の必須 focused gate ではないため、重い全 integration suite ではなく変更範囲に対応する focused suite を実行した。

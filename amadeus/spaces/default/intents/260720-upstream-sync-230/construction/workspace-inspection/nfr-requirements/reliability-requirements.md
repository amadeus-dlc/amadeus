# Reliability Requirements — workspace-inspection

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。availability SLO、RTO、RPOは追加せず、classification completeness、read-only、projection determinism、既定互換を信頼性境界とする。

## Classification correctness

| ID | Scenario | Required behavior |
|---|---|---|
| REL-U06-01 | root signalあり | classified Brownfield、root attribution、fallback未実行。 |
| REL-U06-02 | parse可能submoduleあり | classified Brownfield、submodule attribution、fallback未実行。 |
| REL-U06-03 | root無信号+single nested | classified Brownfield、nestedRoot確定。 |
| REL-U06-04 | root無信号+multiple nested | classified Brownfield、sorted candidates、nestedRootなし。 |
| REL-U06-05 | 完全読取+signalなし | classified Greenfield、既存bytes不変。 |
| REL-U06-06 | 読取不能またはgitmodules parse 0 | inconclusive、advisory、birth/state mutation 0。 |

## Determinism・observability

-同一filesystem snapshotから同一candidate order、language count、framework first-seen order、build systemを得る。
- detect JSONは観測時だけadditive keyを出し、classified既定fixtureのhuman/JSON/state/audit bytesを変更しない。
- doctorは未初期化をadvisoryとして表示し、単独でexitをfailedへ変えない。inconclusiveは分類不能とpath/remedyを明示する。
- new audit event、metrics/tracing backend、retention、alert thresholdを追加しない。

## Fault containment・verification

root列挙不能、metadata read failure、candidate permission、malformed/unsafe gitmodulesでstate/plan/graph/audit/workspaceのbefore/after bytesを比較する。birth reject時はemitter未呼出、detect/doctor/audit projectorは同一snapshotをpure projectionする。

targeted tests、`bun run typecheck`、`bun run lint:check`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci`を同一最終SHAでexit 0とする。未実施/stale結果をgreenへ読み替えない。push前local lcov patch未カバー0、spawn in-process seam、既決waiver証拠条件を満たす。

## トレーサビリティ

REL-U06-01〜06は`business-rules.md`のBR-U06-01〜24、`business-logic-model.md`のDecision table/Verification、`requirements.md`のNFR-1〜6、`technology-stack.md`に対応する。

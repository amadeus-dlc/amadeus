# Code Generation Plan: U003-workflow-warning-traceability

## 上流文脈

U003 は workflow failure 候補を doctor warning として出し、Requirement evidence と PR readiness checklist に接続する。

Warning は診断であり、workflow state を変更しない。

U001 と U002 の evidence は read-only に読む。

## 実装方針

`.agents/aidlc/tools/aidlc-workflow-traceability.ts` に warning detection、Requirement evidence map、PR readiness checklist を集約する。

`.agents/aidlc/tools/aidlc-utility.ts` の doctor には advisory label として Workflow warnings を追加する。

Warning 表示は hard error にしない。

`engineFileExceptions`、`.coderabbit*`、`skills/` は変更しない。

## 変更ファイル

| File | Purpose |
|---|---|
| `.agents/aidlc/tools/aidlc-workflow-traceability.ts` | Workflow warning、Requirement evidence map、PR readiness checklist helper を追加する。 |
| `.agents/aidlc/tools/aidlc-utility.ts` | doctor に Workflow warnings advisory を接続する。 |
| `dev-scripts/evals/workflow-warning-traceability/check.ts` | U003 の deterministic eval を追加する。 |
| `package.json` | U003 eval script を `test:it:all` に接続する。 |

## Plan Steps

- [x] report mismatch warning の pure helper を追加する。
- [x] in-flight abandonment warning の pure helper を追加する。
- [x] state/audit contradiction warning の pure helper を追加する。
- [x] pending human evidence がある場合の false-positive guard を追加する。
- [x] Requirement evidence map で R001-R009 を coverage する。
- [x] PR readiness checklist で missing と failed を pass にしない。
- [x] doctor に non-mutating advisory 表示を追加する。
- [x] U003 deterministic eval を `test:it:all` に接続する。

## Test Strategy

U003 は pure helper fixture と doctor sandbox fixture で検証する。

`npm run typecheck`、`npm run lint:check`、`npm run test:it:workflow-warning-traceability` を必須検証にする。

既存 `npm run test:it:engine-e2e` で engine error path への副作用がないことを確認する。

## Approval

この plan は U003 の code-generation 実装結果に合わせて作成した。

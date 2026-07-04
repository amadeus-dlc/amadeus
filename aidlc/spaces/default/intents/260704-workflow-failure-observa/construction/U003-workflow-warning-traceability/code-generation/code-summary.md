# Code Summary: U003-workflow-warning-traceability

## 変更概要

`.agents/aidlc/tools/aidlc-workflow-traceability.ts` を追加し、Workflow warning、Requirement evidence map、PR readiness checklist を helper 化した。

Warning detection は report mismatch、abandoned stage、state/audit contradiction を扱う。

Pending human evidence がある場合は abandonment warning を抑制する。

`buildRequirementEvidenceMap` は R001-R009 を必ず返し、未記録 item は missing とする。

`buildPrReadinessChecklist` は required item を必ず返し、parity failure は failed として保持する。

`.agents/aidlc/tools/aidlc-utility.ts` の doctor に Workflow warnings advisory を追加した。

Doctor warning は `pass: true` の診断表示であり、workflow state を変更しない。

`dev-scripts/evals/workflow-warning-traceability/check.ts` を追加し、pure helper と doctor 表示を検証した。

`package.json` に `test:it:workflow-warning-traceability` を追加し、`test:it:all` に接続した。

## 境界

`skills/` と `.agents/skills/` は変更していない。

`.coderabbit.yml` と `.coderabbit.yaml` は変更していない。

`dev-scripts/data/parity-map.json` は変更していない。

Collector、dashboard、cloud infrastructure は required item にしていない。

## 検証結果

`npm run typecheck` は成功した。

`npm run lint:check` は成功した。

`npm run test:it:workflow-warning-traceability` は成功した。

`npm run test:it:engine-e2e` は成功した。

`npm run test:it:all` は成功した。

`npm run parity:check` は 8 件の engine file hash 不一致で失敗した。

失敗対象には今回変更した `hooks/aidlc-log-subagent.ts`、`tools/aidlc-lib.ts`、`tools/aidlc-orchestrate.ts`、`tools/aidlc-utility.ts` が含まれる。

既存差分の `aidlc-common/stages/inception/practices-discovery.md`、`knowledge/aidlc-shared/audit-format.md`、`tools/aidlc-state.ts`、`tools/data/stage-graph.json` も含まれる。

方針に従い、`dev-scripts/data/parity-map.json` は変更していない。

## 要件対応

R005 は report mismatch、abandoned stage、state/audit contradiction、pending human evidence 抑制の評価で確認した。

R006 は parity failure を failed として PR readiness に残す評価で確認した。

R007 は Requirement evidence map と `test:it:all` 接続で確認した。

R009 は PR readiness checklist と scope boundary の記録で確認した。

NFR004 は typecheck と lint で確認した。

NFR006 は missing evidence を pass にしない評価で確認した。

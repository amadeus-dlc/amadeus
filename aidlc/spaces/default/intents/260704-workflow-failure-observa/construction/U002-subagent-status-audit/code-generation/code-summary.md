# Code Summary: U002-subagent-status-audit

## 変更概要

`.agents/aidlc/tools/aidlc-subagent-status.ts` を追加し、Subagent outcome の分類を helper に分離した。

分類対象は `SubagentStop` payload の top-level `subagent_status` と top-level `status` に限定した。

`tool_input.status` と message text は outcome の根拠にしない。

`.agents/aidlc/hooks/aidlc-log-subagent.ts` は `SUBAGENT_COMPLETED` event 名を維持し、`Subagent Outcome`、`Status Source`、`Status Value` を additive に出す。

既存の `Agent Type`、`Agent ID`、`Message` field は維持した。

`Message` と `Status Value` は U001 の sanitization helper を通す。

old row に outcome field がない場合は unknown として読む `normalizeSubagentAuditRow` を追加した。

`dev-scripts/evals/subagent-status-audit/check.ts` を追加し、直接 helper と hook integration の両方を検証した。

`package.json` に `test:it:subagent-status-audit` を追加し、`test:it:all` に接続した。

## 境界

`skills/` と `.agents/skills/` は変更していない。

`.coderabbit.yml` と `.coderabbit.yaml` は変更していない。

U002 は U003 を呼び出さない。

Subagent Status helper は `.aidlc-hooks-health/*.drops` を所有しない。

## 検証結果

`npm run typecheck` は成功した。

`npm run lint:check` は成功した。

`npm run test:it:subagent-status-audit` は成功した。

`npm run test:it:engine-e2e` は成功した。

## 要件対応

R004 は success、failure、missing status、untrusted event、`tool_input.status` 除外の評価で確認した。

R007 は U002 eval を `test:it:all` に接続して確認した。

R008 は `SUBAGENT_COMPLETED` event 名を維持し、field を additive にしたことで確認した。

R009 は境界ファイルを変更していないことで確認した。

NFR004 は typecheck と lint で確認した。

NFR005 は old row normalization で確認した。

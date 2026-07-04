# Code Generation Plan: U002-subagent-status-audit

## 上流文脈

U002 は `SUBAGENT_COMPLETED` の audit evidence に、success、failure、unknown の分類を additive field として追加する。

分類は `SubagentStop` payload の top-level `subagent_status` または top-level `status` だけを信頼する。

`tool_input.status`、message text、transcript、last assistant message は outcome の根拠にしない。

既存 row に outcome field がない場合は unknown として読めるようにする。

## 実装方針

`.agents/aidlc/tools/aidlc-subagent-status.ts` に分類、audit field construction、old row normalization を集約する。

`.agents/aidlc/hooks/aidlc-log-subagent.ts` は既存 event 名を維持し、新 helper へ委譲する。

stdout には診断文を出さない。

`skills/`、`.agents/skills/`、`.coderabbit*` は変更しない。

## 変更ファイル

| File | Purpose |
|---|---|
| `.agents/aidlc/tools/aidlc-subagent-status.ts` | Subagent outcome 分類、audit field、old row normalization を追加する。 |
| `.agents/aidlc/hooks/aidlc-log-subagent.ts` | `SUBAGENT_COMPLETED` emission に additive outcome field を接続する。 |
| `dev-scripts/evals/subagent-status-audit/check.ts` | U002 の deterministic eval を追加する。 |
| `package.json` | U002 eval script を `test:it:all` に接続する。 |

## Plan Steps

- [x] success、failure、unknown の allowlist 分類 helper を追加する。
- [x] `SubagentStop` 以外を untrusted unknown にする。
- [x] `tool_input.status` を outcome source から除外する。
- [x] `SUBAGENT_COMPLETED` に `Subagent Outcome`、`Status Source`、`Status Value` を additive に追加する。
- [x] old audit row を unknown として読む normalization を追加する。
- [x] hook stdout を空のまま維持する評価を追加する。
- [x] success、failure、missing status、old row、hook integration の deterministic eval を追加する。
- [x] `test:it:all` へ U002 eval を接続する。

## Test Strategy

U002 は deterministic eval で検証する。

`npm run typecheck`、`npm run lint:check`、`npm run test:it:subagent-status-audit` を必須検証にする。

既存の `npm run test:it:engine-e2e` で `ERROR_LOGGED` の既存 path に副作用がないことを確認する。

## Approval

この plan は U002 の code-generation 実装結果に合わせて作成した。

# Functional Design Questions — opencode-live-closure

参照入力: `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。

## 既決照合

ローカル実測でOpenCode CLI `1.18.4`、headless `opencode run`、custom command指定`--command`、JSON event出力`--format json`、project指定`--dir`、model指定`--model`、既定`--auto=false`を確認した。既存配布物には`.opencode/commands/amadeus.md`と`chat.message`を受けるproject-local pluginがあり、OpenCode公式plugin APIには`tool.execute.after`と`sessionID`/`callID`/tool argsが存在する。したがって静的unsupportedとはせず、安全制約下のlive probeでsupported/unsupportedを閉じるconditional C5/C6設計とする。Issue #1717と上流成果物に矛盾・欠落はなく、追加質問は0件とする。

## Plan

`business-logic-model.md`、`business-rules.md`、`domain-entities.md`を生成する。library Unitのため`frontend-components.md`は生成しない。

## Human Adjudication

- **Date:** 2026-08-03T15:37:56Z
- **Review limit:** Iteration 2で残った1 BLOCKERを人間裁定する。
- **Answer:** 選択肢1。run-owned supervisorをgroup leaderとして残存0を保証するよう修正し、解消扱いとして続行する。

## Cleanup/C8 Contract Adjudication

- **Date:** 2026-08-03T23:21:53Z
- **Question:** cleanup failure時にC8 receiptを残すか、cleanup barrier成功後だけC8 appendを許可するか。
- **[Answer]:** Functional Designへ戻し、cleanup barrier成功後だけC8 appendを許可する。cleanup失敗はC8未記録のstage hard errorとし、PASS、supported更新、materializationを禁止する。

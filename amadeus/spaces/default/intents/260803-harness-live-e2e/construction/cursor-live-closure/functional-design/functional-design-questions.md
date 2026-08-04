# Functional Design Questions — cursor-live-closure

参照入力: `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。

## 既決照合

ローカル実測でCursor IDE `3.13.25`、Cursor Agent `2026.07.23-e383d2b`、認証済みstatus、`cursor agent --print`、text/json/stream-json、ask/plan mode、sandbox、workspace、API key injectionが存在する。したがって静的unsupportedとはせず、安全制約下のlive probeでsupported/unsupportedを閉じるconditional C5/C6設計とする。Issue #1717と上流成果物に矛盾・欠落はなく、追加質問は0件とする。

## Plan

`business-logic-model.md`、`business-rules.md`、`domain-entities.md`を生成する。library Unitのため`frontend-components.md`は生成しない。

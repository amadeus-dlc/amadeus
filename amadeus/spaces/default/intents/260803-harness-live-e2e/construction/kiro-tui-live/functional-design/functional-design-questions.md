# Functional Design Questions — kiro-tui-live

参照入力: `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。

## 既決照合

Issue #1717、上流成果物、既存tmux TUI driver、`kiro-cli 2.13.0`、`tmux 3.7b`と`kiro-cli chat --help`のread-only実測から、TUI transport、private session、opt-in、alternative closureは確定している。矛盾・欠落はなく、追加質問は0件とする。

## Plan

`business-logic-model.md`、`business-rules.md`、`domain-entities.md`を生成する。library Unitのため`frontend-components.md`は生成しない。

## Reviewer上限到達後の人間裁定

Iteration 2で、pane process groupへsignalする前の所有者検証が不足し、PID再利用や誤PGIDにより無関係なdeveloper processを停止し得るBLOCKERが残った。

A. owner-bound検証を追加し、人間裁定でREADYとして続行する
B. Application Designを再開し、共通process ownership contractを改訂する
C. stageを未完了のまま停止する
X. Other (please specify)

[Answer]: A — owner-bound検証を追加し、人間裁定でREADYとして続行する。（ユーザー回答: `1`）

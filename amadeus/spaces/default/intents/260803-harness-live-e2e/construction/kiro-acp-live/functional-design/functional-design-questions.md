# Functional Design Questions — kiro-acp-live

参照入力: `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。

## 既決照合

Issue #1717と上流成果物は、Phase 1 closure後にKiro ACPを共通policyへ接続し、実live greenまたは実測根拠付き後続Issueで閉じることを定義する。既存driver、ローカル`kiro-cli 2.13.0`、ACP help、認証済み`whoami`のread-only実測で必要な設計値を得られたため、追加質問は0件とする。

## Plan

`business-logic-model.md`、`business-rules.md`、`domain-entities.md`を生成する。library Unitのため`frontend-components.md`は生成しない。

## Reviewer上限到達後の人間裁定

Iteration 2で次のBLOCKERが残り、reviewer上限2回へ到達した。

1. domain stateが`phase-verified → gated`で、gate deny時zero-read契約と逆転していた。
2. off-band latchが現在のstatus promptと因果的に結合されず、preseeded pairで偽greenにできた。

A. 2契約を修正し、人間裁定でREADYとして続行する
B. Application Designを再開し、上流contractから改訂する
C. stageを未完了のまま停止する
X. Other (please specify)

[Answer]: A — 2契約を修正し、人間裁定でREADYとして続行する。（ユーザー回答: `1`）

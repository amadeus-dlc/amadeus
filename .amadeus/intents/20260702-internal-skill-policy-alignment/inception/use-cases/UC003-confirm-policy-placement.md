# UC003: 暗黙起動ポリシー配置を確認する

## 概要

Agent は、内部 skill と判定された対象について、Codex と Claude Code の暗黙起動抑制設定の配置先を確認する。

## アクター

- ACT002 Agent

## 外部システム

- なし

## 事前条件

- UC002 で内部 skill の対象が判断されている。
- `skill-forge` の Codex metadata 参照文書を参照できる。

## 基本フロー

1. Agent は `skill-forge` の `agents/openai.yaml` 参照文書を読む。
2. Agent は `policy.allow_implicit_invocation = false` の設定意味を確認する。
3. Agent は `amadeus-*` skill に設定配置が存在するか確認する。
4. Agent は Claude Code 側に同等設定があるか確認する。
5. Agent は設定できる対象と未確認対象を分けて記録する。

## 代替フロー

- Claude Code 側に同等設定が見つからない場合は、非対応理由または後続候補として記録する。

## 対象要求

- R003
- R004

## 未確認事項

- Claude Code 側の同等設定の有無。

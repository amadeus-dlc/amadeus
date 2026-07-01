# UC003: source と昇格先成果物の整合を計画する

## 概要

Agent は、source skill と昇格先成果物の差分確認、昇格手段、検証入口を整理する。

## アクター

- ACT002 Agent

## 外部システム

- なし

## 事前条件

- UC001 と UC002 が完了している。
- source skill と昇格先成果物を読める。

## 基本フロー

1. Agent は `skills/amadeus-*` と `.agents/skills/amadeus-*` の対応を確認する。
2. Agent は対象 skill の source と昇格先成果物の差分確認方法を整理する。
3. Agent は昇格が必要な場合の `dev-scripts/promote-skill.ts` 利用方針を確認する。
4. Agent は `test:it:promote-skill`、`contracts:check`、`validate:workspace` などの検証入口を整理する。

## 代替フロー

- 差分が source skill だけに閉じない場合は、README、validator、example への影響を UC004 へ渡す。

## 対象要求

- R003
- R005

## 未確認事項

- 実際に昇格処理が必要かは Construction で確定する。

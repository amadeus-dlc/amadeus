# UC002: skill-forge 確認範囲を定義する

## 概要

Agent は、`skill-forge` の観点を使い、今回確認する範囲を trigger description、skill 本文、eval、Codex metadata、昇格先成果物に分ける。

## アクター

- ACT002 Agent

## 外部システム

- なし

## 事前条件

- UC001 が完了している。
- `skill-forge` の指示を読める。

## 基本フロー

1. Agent は `skill-forge` の skill authoring、validation、eval、metadata の確認観点を読む。
2. Agent は対象 `amadeus-*` skill の分類に応じて、どの観点を実行するかを候補化する。
3. Agent は eval workflow を実行するか、静的 review に留めるかを判断材料として整理する。
4. Agent は Codex metadata が存在する場合の確認方法を整理する。

## 代替フロー

- Codex metadata が存在しない場合は、新規生成が今回の範囲に含まれるかを未確認事項として残す。

## 対象要求

- R002
- R003

## 未確認事項

- eval workflow の実行有無は Construction で確定する。

上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Scalability Requirements — kimi-hook-adapter

> 上流入力の使用箇所: business-logic-model.md の dispatch フロー(イベント単位の独立起動)、business-rules.md の BR-2、requirements.md の NFR-3、technology-stack.md の既存 hook 機構(並行起動耐性)を根拠とする。

## 対象の概要

本ファイルは本 Unit の NFR 観点のうち該当カテゴリの要件を定める。以下の判定・基準は全て上流の設計成果物から導出したもので、新規の要件を追加しない。

## 判定と基準

- adapter 自体は無状態で、スケールの概念を持たない(イベントごとの独立プロセス)
- 同一イベントの複数ルールは Kimi が並行起動しうるため、core hooks 側の既存のロック機構(mkdir ベースの監査ロック — AGENTS.md 記載の portable な仕組み)に依存する。adapter 側で状態を持たないことが前提条件
- イベント量の規模増(多発する PostToolUse)でもリニアにコストが増えるだけで、共有リソースの競合は core 側の既存設計に吸収される

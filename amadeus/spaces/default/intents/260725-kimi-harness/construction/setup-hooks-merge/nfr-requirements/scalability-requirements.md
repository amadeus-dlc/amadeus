上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Scalability Requirements — setup-hooks-merge

> 上流入力の使用箇所: business-rules.md の BR-3、business-logic-model.md の検証シーケンス、requirements.md の NFR-3(a)、technology-stack.md の既存構成を根拠とする。

## 対象の概要

本ファイルは本 Unit の NFR 観点のうち該当カテゴリの要件を定める。以下の判定・基準は全て上流の設計成果物から導出したもので、新規の要件を追加しない。

## 判定と基準

- config の規模増(ユーザーの `[[hooks]]` が増えた場合)でも、managed block の識別・除去が安定していること(requirements.md NFR-3(a) の将来条件。マーカー基準のため既存量に依存しない)
- 複数プロジェクトへの導入が増えても、各 config は独立(共有状態なし — business-rules.md の適用範囲どおり)

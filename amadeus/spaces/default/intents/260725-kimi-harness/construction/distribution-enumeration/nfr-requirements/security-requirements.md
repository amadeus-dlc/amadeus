上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Security Requirements — distribution-enumeration

> 上流入力の使用箇所: business-rules.md の BR-2/BR-4、business-logic-model.md の dogfood 検証手順、requirements.md の FR-6(dogfood 検証の内容)を根拠とする。

## 対象の概要

本 Unit は dist/セルフインストールの生成と検証で、書き込み対象は本リポジトリ内に限られる。

## 脅威モデルと基準

- `dist/kimi/`・ルート `.kimi-code/` は生成物で、手編集を禁止(business-rules.md BR-2)。改ざんは drift guard で検出
- dogfood の実機確認は本リポジトリで行い、ユーザーの実 config への配線は Q1 手順(バックアップ・マーカー・除去)に従う(business-logic-model.md §dogfood 検証)
- ユーザーの環境(他プロジェクト)に影響する操作は行わない

上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Reliability Requirements — kimi-hook-adapter

> 上流入力の使用箇所: business-rules.md の BR-2/BR-3、business-logic-model.md の決定木、requirements.md の NFR-2/NFR-4、technology-stack.md の hook 実行基盤を根拠とする。

## 対象の概要

本ファイルは本 Unit の NFR 観点のうち該当カテゴリの要件を定める。以下の判定・基準は全て上流の設計成果物から導出したもので、新規の要件を追加しない。

## 信頼性の仕組み

- **fail-open の全経路保証**: adapter の例外・core hook 不在・未知イベント/フィールドで、ユーザーの Kimi セッションを止めない(business-rules.md BR-2)。ワークフロー未導入のプロジェクトでは完全に no-op
- **Stop block のみ特別扱い**: 整形された block 出力のみ verbatim 中継し、壊れた出力は中継しない(business-rules.md BR-3、business-logic-model.md 決定木)
- **回復**: adapter の不調はワークフローの advisory 機構が落ちるだけで、セッション継続を妨げない。恒久復旧は再インストール(配線は managed block で冪等)
- **回帰防止**: 変換表は capture 済み payload の契約テストで固定(requirements.md FR-7a)

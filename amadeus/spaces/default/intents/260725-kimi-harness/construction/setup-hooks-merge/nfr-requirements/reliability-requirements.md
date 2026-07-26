上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

# Reliability Requirements — setup-hooks-merge

> 上流入力の使用箇所: business-logic-model.md のマージフロー(手順6: バックアップ→apply-write による atomic 書込み、重複検出の loud fail)と決定木、business-rules.md の BR-3/BR-4/BR-5、requirements.md の NFR-2/NFR-3(b)、technology-stack.md の既存実行基盤を根拠とする。

## 対象の概要

本ファイルは本 Unit の NFR 観点のうち該当カテゴリの要件を定める。以下の判定・基準は全て上流の設計成果物から導出したもので、新規の要件を追加しない。

## 信頼性の仕組み

- **atomic 書込み**: business-logic-model.md マージフロー手順6(バックアップ作成 → 既存 apply-write port の tmp→rename)で、途中失敗が config を壊さない(business-rules.md BR-4、requirements.md NFR-3(b) のクラッシュ耐性)
- **冪等・再入可能**: 同一内容は noop、旧内容は replace(business-rules.md BR-3)。重複検出(2組以上)は business-logic-model.md §planMerge の規定どおり loud fail で自動修復しない
- **壊れた TOML**: loud fail で上書きしない(business-rules.md BR-5)
- **回復**: バックアップからの手動復元が回復経路(business-rules.md BR-4)。managed block の除去で初期状態へ戻せる
- **検証**: FR-7c の単体テスト群(add/noop/replace/loud fail/atomic/除去)が回帰防止

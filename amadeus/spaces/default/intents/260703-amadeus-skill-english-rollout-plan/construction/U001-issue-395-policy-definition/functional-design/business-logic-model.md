# Business Logic Model：#395 方針確定

## 目的

Amadeus skill の `SKILL.md` 英語化を進める前に、方針判断、対象範囲、検証方法、PR 境界を確定する。

B001 では Issue #395 を対象にし、後続の #400、#401、#402 が同じ判断基準を参照できる状態を作る。

## 対象 Unit

U001 #395 方針確定

## 業務ロジック

方針判断は、`SKILL.md` を英語化するか、現状維持するかを決める。

英語化する場合は、source skill、昇格先 skill、`agents/openai.yaml` の扱いを対象範囲として分ける。

生成される Amadeus DLC 成果物、テンプレート由来の日本語 Markdown、ユーザー向け gate 文言は日本語のまま維持する。

言語ルールとの衝突は、英語化 PR の前提条件として解消する。

昇格先 skill は直接編集せず、source skill から昇格フローで反映する。

検証結果は PR 説明に記録し、#395 の完了証拠は対応 PR の merge または明示的な Issue close とする。

## 入力

- Issue #395 の本文と受け入れ条件
- `requirements.md` の R001、R002、R004、R005
- `unit-of-work.md` の U001
- `bolt-plan.md` の B001
- `CONTEXT.md` と `.agents/rules/` の現行言語ルール

## 出力

- 英語化方針の判断基準
- 対象ファイルと対象外ファイルの境界
- 日本語生成成果物契約の維持条件
- source skill と昇格先 skill の同期条件
- PR 説明へ記録する検証条件
- #395 の完了証拠

## 未確認事項

- #395 対応 PR で言語ルール変更まで含めるか、方針文書の確定だけに分けるかは Code Generation で最小変更として決める。

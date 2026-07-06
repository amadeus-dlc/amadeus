# Personas：Amadeus skill 英語化実施計画

## 概要

この成果物は、Issue #399 の要求を使う人間アクターを整理する。

対象アクターは、Intent Statement の対象者に合わせる。

## ペルソナ一覧

| ID | ペルソナ | 役割 | 主な関心 |
|---|---|---|---|
| P001 | Maintainer | Amadeus 本体の方針、PR、merge 判断を行う。 | 子 Issue の順序、依存関係、完了証拠、親 Issue の完了判断。 |
| P002 | Agent | skill、validator、example、docs の変更を提案または実行する。 | どの Issue をどの順序で扱うか、どの証拠を残すか。 |
| P003 | Reviewer | PR の妥当性、検証、コメント対応を確認する。 | 英語化 PR の翻訳変更、意味変更、昇格フロー、検証結果の境界。 |

## 補足

ここでのペルソナは、実装対象の利用者分類ではなく、Issue #399 の進行と判断に関わる人間アクターを表す。

Agent は作業を実行する役割として扱うが、merge 判断は Maintainer が行う。

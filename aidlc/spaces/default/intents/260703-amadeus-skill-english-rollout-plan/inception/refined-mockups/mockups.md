# Mockups：Amadeus skill 英語化実施計画

## 概要

この成果物は、Ideation の rough mockups を要求とストーリーに対応づけて精緻化する。

この Intent は UI を対象にしないため、mockup は Issue 完了追跡の相互作用図として扱う。

## M001：子 Issue の順序と依存

対応要求は R001 である。

対応ストーリーは S001 である。

```mermaid
flowchart TD
  issue399["#399 親タスク"]
  issue395["#395 方針確定"]
  issue400["#400 小さい土台 PR"]
  issue401["#401 AI-DLC v2 差分対応順序"]
  issue402["#402 残り展開単位"]

  issue399 --> issue395
  issue395 --> issue400
  issue400 --> issue401
  issue401 --> issue402
```

## M002：完了証拠の確認

対応要求は R002 と R005 である。

対応ストーリーは S002 と S005 である。

```mermaid
flowchart TD
  target["子 Issue"]
  pr["対応 PR"]
  issueClose["明示的な Issue close"]
  merge["PR merge"]
  evidence["完了証拠"]
  parent["#399 完了判断"]

  target --> pr
  pr --> merge
  target --> issueClose
  merge --> evidence
  issueClose --> evidence
  evidence --> parent
```

## M003：#401 配下 Issue の扱い

対応要求は R003 である。

対応ストーリーは S003 である。

```mermaid
flowchart TD
  issue401["#401"]
  issue391["#391"]
  issue392["#392"]
  issue393["#393"]
  issue394["#394"]
  evidence401["#401 の完了証拠"]
  parent["#399 完了判断"]

  issue401 --> issue391
  issue401 --> issue392
  issue401 --> issue393
  issue401 --> issue394
  issue391 --> evidence401
  issue392 --> evidence401
  issue393 --> evidence401
  issue394 --> evidence401
  evidence401 --> parent
```

## M004：skill 英語化 PR の確認境界

対応要求は R004 である。

対応ストーリーは S004 である。

```mermaid
flowchart TD
  pr["skill 英語化 PR"]
  translation["翻訳変更"]
  semantic["意味変更"]
  promotion["昇格フロー"]
  verification["検証結果"]
  reviewer["Reviewer 判断"]

  pr --> translation
  pr --> semantic
  pr --> promotion
  pr --> verification
  translation --> reviewer
  semantic --> reviewer
  promotion --> reviewer
  verification --> reviewer
```

## M005：完了判断

対応要求は R005 である。

対応ストーリーは S005 である。

```mermaid
flowchart TD
  e395["#395 完了証拠"]
  e400["#400 完了証拠"]
  e401["#401 完了証拠"]
  e402["#402 完了証拠"]
  all["子 Issue 完了証拠がそろった状態"]
  done["#399 完了判断"]

  e395 --> all
  e400 --> all
  e401 --> all
  e402 --> all
  all --> done
```

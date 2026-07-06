# User Flow：Amadeus skill 英語化実施計画

## 子 Issue 完了追跡

開始: #399 の計画 Intent が承認された状態。

終了: #402 の対応 PR merge または Issue close を確認した状態。

```mermaid
flowchart TD
  start["#399 計画 Intent 承認"]
  define["#395、#400、#401、#402 の順序と依存関係を記録"]
  i395["#395 の完了証拠を確認"]
  i400["#400 の完了証拠を確認"]
  i401["#401 の完了証拠を確認"]
  i391394["#391〜#394 の扱いを確認"]
  i402["#402 の完了証拠を確認"]
  end["#399 の親タスクとして完了判断できる"]

  start --> define
  define --> i395
  i395 --> i400
  i400 --> i401
  i401 --> i391394
  i391394 --> i402
  i402 --> end
```

## 例外フロー

子 Issue の順序を変更する必要が出た場合は、Scope Definition の判断を更新対象として扱う。

子 Issue の完了証拠が PR merge でも Issue close でも確認できない場合は、完了扱いにしない。

目的と異なる指摘が PR で見つかった場合は、後続 Issue 候補として扱い、この Intent の直接完了条件へは追加しない。

# Security Design — U3-mirror-config

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## SD-U3-1: 合法キーの閉じた境界(SR-U3-1)

設定スキーマは`auto-mirror`のboolean値だけを受理する。認証情報、トークン、任意文字列を格納する拡張面は作らない。3設定面はgit共有されるため、合法キー列挙をコード上の単一正本として保持し、追加キーは明示的な仕様変更として扱う。

## SD-U3-2: parse境界でのfail-closed検証(SR-U3-2)

文字列入力を純関数`parse`へ渡す。合法なルート値は「`null`ではなく、`Array.isArray(value)`も偽であるJSON object」に限定する。JSON構文破損、配列・null・文字列・数値・booleanのルート値、未知キー、`auto-mirror`の型不整合を層名・項目名付きの型付きエラーへ変換する。未知キーと型不整合は同一面内で全件収集し、invalidが1面でもあれば解決値を返さない。部分的に読めた面だけで後勝ちマージする経路は禁止する。

## セキュリティ検証

unitテストでルート値の空配列、非空配列、null、文字列、数値、booleanをすべてinvalidとして固定する。加えて未知キー、`auto-mirror`値の文字列・数値・null、構文破損、複数違反の全件列挙を検証する。integrationテストではGlobal、Space、Intentのいずれにinvalidを置いても`ResolveOutcome.invalid`となり、設定値が利用側へ流れないことを検証する。

# Business Logic Model

## 目的

U001 で定義した Construction traceability 契約を、template、eval、source skill、昇格先 skill の間で揃える。

## 対象 Unit

U002 traceability template alignment。

## 業務ロジック

標準 traceability template は、Construction 作成時点で完了時表の構造を示す。
そのため、`Task Generation からの追跡` と `Deployment Unit からの追跡` に加えて、`Construction からの追跡` を持つ。

template eval は、標準 template がこの見出しを持つことを検査する。
example は既存の phase と状態を確認し、完了済み Construction の例にだけ完了時表を求める。

source skill と昇格先 skill は同じ説明を持つ。
差分が残る場合は、R004 を満たせない。

## 入力

- U001 の Functional Design。
- traceability template。
- template eval。
- source skill と昇格先 skill。
- 既存 examples。

## 出力

- 更新済み traceability template。
- 更新済み template eval。
- example 更新要否の判断。
- source skill と昇格先 skill の整合証拠。

## 未確認事項

なし。

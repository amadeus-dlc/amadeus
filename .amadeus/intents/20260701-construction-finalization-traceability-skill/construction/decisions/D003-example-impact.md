# D003: example impact

## 背景

B002 は `examples/**/construction/traceability.md` の更新要否を確認対象にしている。
完了済み Construction では `Construction からの追跡` が必要だが、Task Generation ready の例に完了証拠を強制すると状態と矛盾する。

## 判断

完了済み Construction の example に `Construction からの追跡` がない場合だけ更新対象にする。
未完了または Task Generation ready の example は、完了時表の追加対象外にする。

## 理由

完了証拠を持たない example に完了時表を強制すると、実行していない検証を証拠として記録するリスクがあるため。

## 影響

今回の差分では example snapshot を更新しない。
既存の完了済み Construction 例は `Construction からの追跡` を持つ。

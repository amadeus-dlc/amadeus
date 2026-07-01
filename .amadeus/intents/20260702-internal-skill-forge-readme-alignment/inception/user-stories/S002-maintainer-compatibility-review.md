# S002: Maintainer の互換性判断

## ユーザーストーリー

Maintainer として、README 分類、互換性維持対象、検証条件が Amadeus の自己開発方針と合っていることを判断できるようにしたい。

これにより、暗黙の互換層を追加せず、公開入口と内部 skill の扱いを一貫させられる。

## 対象要求

- R001
- R004
- R005

## 受け入れ状態

- README に内部 skill を載せる範囲を判断できる。
- 互換性維持対象を追加する必要があるかを判断できる。
- README 更新後の検証条件を確認できる。

## 未確認事項

- `docs/backward-compatibility.md` を新規作成する必要があるかは Construction で判断する。

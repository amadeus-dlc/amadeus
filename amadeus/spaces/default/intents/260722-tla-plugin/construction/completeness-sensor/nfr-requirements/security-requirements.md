# Security Requirements — U5 completeness-sensor

上流入力: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 入力検証

- `model-map.json` の `implPath` はPOSIX相対パスのみ受理し、絶対パス、`..`、重複パス、非64桁SHA-256を拒否する。
- repo root と対象を `realpath` し、対象がroot配下のregular fileであることをopen直前とread後に再確認する。祖先または末端のsymlink、FIFO、device、socketを拒否し、1ファイル16MiB・総量64MiBを上限とする。
- sensor は登録簿、モデル、実装を読取専用で扱い、更新操作を行わない。
- 対象ファイル不在・読取不能・map不正は FAILED とし、無言 skip を禁止する。

## 供給網と情報管理

- Bun/TypeScript/標準暗号APIのみを使用し、新規依存を追加しない。
- findings は相対パスと不一致理由だけを含め、ファイル内容・秘密情報を出力しない。
- `updateModelMap` は現在のmodel identityが登録済みidentityと異なる場合だけ受理し、新しいmodel identity、cfg identity、実装hash集合を1つのcanonical recordとしてatomic publishする。

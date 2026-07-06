# Security Test Instructions

Unit: no-stub-lint（Test Strategy: Minimal）

## 適用判断

限定適用とする。本 rule は検査の免除経路（許可リスト）を持つため、その完全性だけ確認した。

## 検査

- 無効宣言（維持理由・終了条件の空欄、空白のみセル）は照合に使われない（eval (c) + reviewer の境界値検証）。
- glob 照合に prefix 衝突・ディレクトリ境界超え・空 glob 全件マッチがないこと（reviewer 実測）。
- 自己参照の穴（rule 自身の scan 除外）を作っていないこと（BR-8、自己ヒット 0 件）。
- 秘密情報のハードコードなし。

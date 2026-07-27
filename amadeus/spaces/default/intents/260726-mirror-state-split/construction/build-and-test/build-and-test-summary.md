# Build & Test Summary — 260726-mirror-state-split

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(いずれも construction/fix-mirror-state-split/code-generation/)。結果の正本は build-test-results.md(engine directive の宣言名 — stage 本文の test-results.md 表記より優先)。

## 要約

- 修正: mirror 状態表現の read 側3箇所を v1 ブロック権威へ統一(#1547)、legacy デッドコード削除、重複 create の正しい拒否、canonical レンダラ寄せ(逸脱裁定 B)
- テスト: regression-first(t300 5ケース、pre-fix 赤の verbatim 再現)+ t232/t265 書換。全スイート green
- 配布: dist+self-install 48 ファイル再生成、ドリフトガード green
- 残作業(ステージ外): push → PR → CI/codecov 実測 → ユーザー承認マージ → #1547/#1534 クローズ(close-after-landing)

## テスト戦略整合(Minimal)

新規テストは FR-5(regression)へ trace する integration 層のみ。性能・セキュリティは比例選定で新規生成なし(根拠は performance/security-test-instructions.md)。

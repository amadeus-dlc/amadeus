# Build Instructions — 260716-covci-flake

## 上流入力(consumes 全数)

`code-generation-plan.md`(調査計画)、`code-summary.md`(AC 閉包表)、requirements.md FR-4。

## 適用整理

**ビルド対象なし** — E-1085-FIX 裁定 A(発動条件付き保留)によりリポジトリ変更ゼロ(declare-docs-only 済み)。FR-4 は「修正を伴う場合」の条件付き AC であり非発動。

## 健全性確認(任意実施分)

作業ツリーの baseline 確認として `bash tests/run-tests.sh --smoke` を実施(下記 results 参照)。

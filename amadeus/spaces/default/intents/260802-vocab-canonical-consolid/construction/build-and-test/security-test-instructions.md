# Security Test Instructions — vocab-canonicalization

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

- `code-generation-plan.md` の実行形態・完了条件と `code-summary.md` の実測値(PR #2044、head b783fe45c、検証表)を本書の前提として参照した

## 判定: 専用セキュリティテストは生成しない(根拠付き)

- 承認済み要件にセキュリティ NFR なし。生成器はリポジトリ内ファイルのみ読み書きし、外部入力・ネットワーク・秘密情報・認証境界に触れない(FD ADR-2 の影響評価どおり)
- 適用済みの構造的安全: 書込先はマーカー区間+生成物ファイルに限定、未解決リンク・未知 projection は fail-closed
- リポジトリ全体の依存監査は本 intent のスコープ外(cid:build-and-test:c1-doctor-seam の分離判定に従う)

## 再判定の条件

- 生成器が外部入力(リモート語彙源等)を受ける設計変更が提案された場合、その時点でセキュリティ NFR とテストを必須化する。

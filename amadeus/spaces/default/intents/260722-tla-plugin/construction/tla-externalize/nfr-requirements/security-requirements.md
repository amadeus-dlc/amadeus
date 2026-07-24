# Security Requirements — U1 tla-externalize

上流入力: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 入力境界と完全性

- モデル、設定、登録簿のパスはリポジトリ所有の `specs/tla/` 配下に固定し、利用者入力から任意パスを組み立てない。
- 不在、空、読取不能、identity 不一致はすべて loud failure とし、埋め込みモデルへのフォールバックや検証 skip を禁止する。
- `model-map.json` は正規の相対パスと SHA-256 を保持し、パストラバーサル、重複エントリ、不正ハッシュ形式を拒否する。

## 供給網・機密性・コンプライアンス

- U1 は新規外部依存を導入せず、Bun/TypeScript と標準ファイル API の既存技術スタックを維持する。
- TLA+モデル、設定、ハッシュ登録簿はいずれも公開リポジトリの設計資産であり、秘密情報・個人情報・認証情報を含めない。
- 規制対象データを処理しないため GDPR、HIPAA、PCI DSS の追加コントロールは非該当。Git 履歴と CI 結果を変更証跡として保持する。

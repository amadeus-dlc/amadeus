# Security Test Instructions — p3-repair-batch6

本 intent はセキュリティ境界の変更を1点含む: #848 の workspace_requires 免除経路。

- **検証済みの防御**: 宣言(declare-docs-only)には human-approval audit イベントへの evidence 参照が必須で、形式検査+audit 実在照合の二段(t215 で不正 evidence の拒否を固定)。宣言なしの拒否経路は従来どおり(#366 型検出の保全をテスト固定)。免除発動は GUARD_EXEMPTED として監査記録され、テスト用 env bypass と独立(t215 で実証)。
- **#847 の lint:check ラップ**: E-B6b 裁定 (B) により検出対象を lint:check 宣言に限定(変異しうる任意 script の自動実行リスクを回避する安全側設計)。script は check-only(write/fix フラグなし)であることを両 package.json で確認済み。
- 新規シークレット・認証情報・外部サービス接続なし。

# Security Test Instructions — 260814-autonomy-stop-fixes

## 判定: 新規の security テスト生成は不要(既存ガードで被覆)

上流入力の実測: `requirements.md` に SAST/DAST・認証・注入などの検査対象となる security NFR は宣言されていない。本 unit のセキュリティ関連面は NFR-1「grant の効果分類(new-permission / irreversible 等5分類は grant 認可不可)を変更しない」のみで、これは認可契約の不変条件であり、次で被覆される:

- `tests/integration/t2974-error-arm-boundary.integration.test.ts` — boundary 節が「梯子経由は grant の認可範囲を広げない」文言を要求(`code-summary.md` 記録)
- 既存の認可系テスト群(intent-autonomy / grant scope 系)がフルスイートに常駐し green(build-test-results.md 参照)

秘密情報のハードコード・入力検証面の変更はない(diff は md 文書 + テスト1本)。目標なき検査の体裁生成はしない(`cid:build-and-test:c2-no-test-theatre-for-absent-nfr`)。

## この判定を覆す条件

remote write 梯子の実装(契約でなく実行コード)が追加される将来の intent では、認可バイパス・provenance 偽造の攻撃面テストを設計する。

# Unit Test Instructions — packaging-repair-batch

> 2バグの回帰テスト(すべて修正前赤・修正後緑の落ちる実証済み)。

## 対象テストと実行方法

| Unit | テスト | 実行 |
|---|---|---|
| u701-package-check-orphan (#701) | ルート直下/未宣言サブディレクトリ orphan 検出(負2+正1) | `bun test tests/integration/t-package-check-root-orphan.test.ts` |
| u702-release-sync-atomic (#702) | 純粋 seam: 4遷移+all-or-nothing(9ケース) | `bun test tests/unit/t-release-sync-plan.test.ts` |
| u702-release-sync-atomic (#702) | CLI 失敗経路: パターン不一致で書込ゼロ | `bun test tests/integration/t-release-sync-atomicity.test.ts` |
| u702(同時更新)| t68 静的同期ガードの prerelease 対応 | `bun test tests/unit/t68-version-changelog-sync.test.ts` |

## 注意

- 本バッチの新規テストは bare `bun test <file>` の単体直実行でも緑(hermetic、PR #703 の規律に準拠。spawn には env: { ...process.env } を明示)

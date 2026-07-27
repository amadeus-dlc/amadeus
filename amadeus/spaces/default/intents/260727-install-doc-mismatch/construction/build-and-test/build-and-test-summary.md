# Build and Test Summary — 260727-install-doc-mismatch

上流入力(consumes 全数): code-generation-plan.md(全 Step 完了のチェック済み計画)、code-summary.md(実装・検証の一次記録)。

## ビルド状況

- 前提: Bun / `bun install`(lockfile 変化なし)
- ビルド(dist 7ハーネス+self-install): 完了・ドリフト 0(dist:check / promote:self:check とも exit 0 — B&T 段で fresh 再実測)

## テストタイプ目録

| タイプ | 生成/選定 | 根拠 |
|---|---|---|
| Unit/Integration(リグレッション) | t307 追加アサート3件(実装済み)+連動 integration 6ファイル | FR-5、regression-first |
| Integration(新規) | 追加なし | 既存スイートで被覆(bt-proportional-selection) |
| Performance | N/A | 性能 NFR 不在・挙動不変(instructions 参照) |
| Security | N/A | セキュリティ境界に非接触(instructions 参照) |

## Readiness 評価

- build-ready: **YES**(dist/self-install 同期 green)
- test-ready: **YES**(対象+連動テスト 44 tests / 7 files 全 pass、full CI 606 ファイル PASS は CG 段実測)
- deployment-ready: **条件付き YES** — PR #1579 の CI 完走とマージ承認(人間)が残条件。リリース操作(release.yml)は本 intent 対象外

## 既知の制限・残項目

- PR #1579 の CI 完走待ち(実測は build-test-results.md 参照)
- Issue #1569 のクローズは PR マージ着地確認後(close-after-landing)

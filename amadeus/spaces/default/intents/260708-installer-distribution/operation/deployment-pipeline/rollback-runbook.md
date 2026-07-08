# Rollback Runbook — installer-distribution

> ステージ: deployment-pipeline (4.1) / 作成: 2026-07-09
> 出典: 手順書章7(deprecate+patch)、`../../construction/ci-pipeline/ci-pipeline.md`

## 前提

npm は publish 後 72 時間・依存ゼロ等の条件を満たさない限り unpublish を推奨しない。**原則 unpublish 不使用**、deprecate+パッチ版で前進回復する。

## 手順(公開版 X.Y.Z に重大な不具合が判明した場合)

1. **封鎖**: `npm deprecate @amadeus-dlc/setup@X.Y.Z "Broken: <要旨>. Use X.Y.(Z+1)."` — 新規取得者に警告(既存導入は影響なし)
2. **修正**: 通常の Bolt/PR フロー(5ゲート)で修正 → `vX.Y.(Z+1)` タグ → 手順書どおり publish
3. **検証**: `npx @amadeus-dlc/setup@latest --help` が新パッチを解決すること、deprecate 警告が旧版で表示されることを確認
4. **利用者側の巻き戻し不要性**: install/upgrade は非破壊(バックアップ `$namefile.$timestamp.bk`+manifest)なので、不具合版で導入した利用者はパッチ版で `amadeus-setup upgrade` すれば回復する。手動復旧が必要な場合はバックアップからの復元を案内(troubleshooting ガイド)

## エスカレーション

- npm レジストリ障害・アカウント侵害疑いは npm サポート+2FA リセットフロー(手順書章1 の前提管理)
- タグと CHANGELOG の不整合が発覚した場合は t68 相当の3点同期を修正 PR で回復(タグの張り替えはしない — 新パッチで前進)

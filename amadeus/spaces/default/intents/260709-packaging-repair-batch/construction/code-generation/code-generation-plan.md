# Code Generation Plan — packaging-repair-batch

bugfix スコープのため units-generation は SKIP(consumes_absent expected)。requirements.md の FR 構成に従い、独立した2ユニットとして並列実装する(Bolt=PR も2本、org.md/team.md の Bolt 単位 PR 規範)。

## ユニット構成

| unit | 対象 | 修正面 | テスト面 |
|---|---|---|---|
| u701-package-check-orphan | Issue #701 / FR-701 | `scripts/package.ts` の --check に dist/<name>/ 全域の orphan 検査を追加(期待集合 = harness dir サブツリー + 宣言済み projectRoot 出力 + emit 済み集合) | 新規 `tests/integration/t-package-check-root-orphan.test.ts`(負2: ルート直下/未宣言サブディレクトリ植込みで exit≠0 + ORPHAN 行、正1: クリーンで exit 0)。t145 は無改修緑 |
| u702-release-sync-atomic | Issue #702 / FR-702 | `scripts/release-version-sync.ts` のバッジ regex 対称化 + validate-then-write の2相化(全パターン検証→全通過後に書込) | 純粋 seam(検証/置換計画)を in-process でテスト + 失敗経路の CLI 実測(temp git fixture でパターン不一致 → exit 1 かつ全ファイル無変更)。`tests/unit/t68-version-changelog-sync.test.ts` のバッジ regex を prerelease 対応へ同時更新 |

## 実装規律

- 各ユニットは隔離 worktree 内で `origin/main` からブランチを切って実装する(ブランチ名: `fix/701-package-check-root-orphan` / `fix/702-release-sync-prerelease-atomic`)。
- **落ちる実証(赤先行)**: リグレッションテストを先にコミットし、未修正コードに対して赤(exit≠0)を実測記録 → 修正 → 緑(exit 0)を実測記録。両方の exit code を code-summary に残す。
- #702 の CLI 失敗経路テストは、検証失敗が書込前に起きること(半適用ゼロ)を fixture の全ファイル byte 比較で検証する。成功経路(regen を伴う)は純粋 seam テスト + 既存 t68 で担保し、テスト専用分岐を本番コードに置かない(construction ガードレール)。
- 検証コマンド: `bun run typecheck` / `bun run lint` / 対象テスト個別 + `bash tests/run-tests.sh --ci` / `bun run dist:check` / `bun run promote:self:check`(scripts/ 変更は dist 非接触の想定だが Mandated に従い実測)。
- 本番コードへのテスト専用分岐・env フラグの追加は禁止。#702 は「純粋な検証/計画 seam の抽出 + CLI main の2相化」で対応する。

## レビュー

- reviewer: amadeus-architecture-reviewer-agent(unit ごと、max 2 iterations)。
- PR 作成時に codex-2/3 へ直接レビュー依頼(codex-1 は #687 実装中)。

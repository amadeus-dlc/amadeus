# Bolt Plan — `@amadeus-dlc/setup`(installer-distribution)

> ステージ: delivery-planning (2.8) / 作成: 2026-07-08
> 上流入力: `../requirements-analysis/requirements.md`、`../user-stories/stories.md`、`../application-design/components.md`、`../units-generation/unit-of-work.md`・`unit-of-work-dependency.md`、team.md(Walking Skeleton / Deployment / Way of Working)
> 決定の出典: `delivery-planning-questions.md` Q1・Q2

## Bolt シーケンス(5 Bolt、直列)

### Bolt 1: walking-skeleton 🦴(単独ゲート — team.md 規定)

- **Unit**: U1 の一部+U2 の中核経路
- **内容**: `packages/setup` 骨格(package.json 正メタデータ・bin・`bun build` 単一バンドル・lint/typecheck 配線)+最小の `install` 縦スライス: 最新 `vX.Y.Z` タグ解決 → アーカイブ取得 → 1ハーネス(claude)展開 → ファイル存在検証
- **証明するレイヤー**: CLI 起動(bunx/npx)→ resolver → fetcher → planner/applier(最小)→ verifier — 全アーキテクチャ層を1本の線で貫通
- **Definition of Done**: フィクスチャ(モックアーカイブ)での E2E がグリーン+`bun run typecheck`/`lint`/既存スイート維持+skeleton の差分レポート最小版が出力される
- **確信仮説**: 「GitHub タグ取得 → 展開 → 検証の縦ラインが bun/TypeScript+依存ゼロで成立し、非破壊マージ実装(R4)の工数感が測れる」
- **期待デモ**: クリーンな一時ディレクトリへ `amadeus-setup install --harness claude --target <tmp> --yes` が完走し、`.claude/` 一式とマニフェストが生成される
- **マージ**: worktree ベース `main`、スカッシュマージ(org.md)。**Bolt 1 承認後にラダープロンプト**(以降の自律/ゲート選択)

### Bolt 2: install-complete

- **Unit**: U1+U2 の残り完成
- **内容**: 対話ウィザード、非対話モード完全版、衝突ハンドリング、導入済み検出+upgrade 案内(FR-004)、doctor 相当検証、エラー分類(FR-012)、マニフェスト完全版(FR-016)
- **DoD**: US-A1〜A7 の受け入れ基準を写したテストがグリーン。Given/When/Then の各分岐に対応するテストケース存在
- **確信仮説**: 「新規ユーザーの1コマンド・1分導入(成功指標1)が全分岐で成立する」

### Bolt 3: upgrade

- **Unit**: U3
- **内容**: 導入状態分類(manifested/manual-or-unknown/partial/none)、差分レポート、md5+`$namefile.$timestamp.bk` 退避、バージョン境界5ケース、`--force` セマンティクス
- **DoD**: US-B1〜B5 の受け入れ基準テストがグリーン。NFR-002(退避検証)を含む
- **確信仮説**: 「既存ユーザーがカスタマイズを失わず更新できる(成功指標3)— 差別化の中核が成立する」

### Bolt 4: publish-readiness

- **Unit**: U4
- **内容**: pack ファイルリスト契約テスト(FR-018、失敗注入の実証込み)、publish 手順書(FR-015: 手動 publish・`vX.Y.Z` タグ発行・setup 独立 semver・プレリリース/`next` 運用)、root package.json の I1/I2 是正
- **DoD**: `npm pack --dry-run` テストが CI で赤→緑の実証済み。手順書レビュー済み
- **確信仮説**: 「publish 直前の人的ミス(メタデータ・同梱物)が機械検出される」
- **外部依存**: npm スコープ確保(R1)— 最終 publish 検証のみブロック。手順書・テストは先行可

### Bolt 5: docs-rollout

- **Unit**: U5
- **内容**: README 導入セクションのワンライナー化(FR-014)、CHANGELOG+framework 版バンプ+バッジ同期(t68)
- **DoD**: README から `cp -r` 主経路が消え(成功指標2)、t68 グリーン
- **確信仮説**: 「新規ユーザーが README だけで導入に到達できる」

## 全体の完了条件

- Bolt 1〜5 完了+3.6 build-and-test(全体)+3.7 ci-pipeline を経て、成功指標1〜3 の検証手段が揃う
- 実リリース(npm publish 実行・初回タグ発行)はメンテナの手動作業(CON-004)— operation フェーズ(deployment-pipeline / deployment-execution)で手順の実行性を確認

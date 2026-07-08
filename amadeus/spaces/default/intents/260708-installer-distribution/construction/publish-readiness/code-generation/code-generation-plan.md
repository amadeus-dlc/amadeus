# Code Generation Plan — publish-readiness(U4 / Bolt 4)

> ステージ: code-generation (3.5) / Unit: publish-readiness / 作成: 2026-07-09
> 出典: `../functional-design/`(business-logic-model: pack 契約テスト+手順書7章立て+PR 分割シーケンス)、`../nfr-design/`(performance-design: pack 3回≤28秒・遅延ビルド共有、logical-components: tests/lib 配置)、`../infrastructure-design/`(cicd-pipeline: integration 層同乗・遅延ビルドヘルパー消費・実ネットワーク E2E の設定者、shared-infrastructure)、FR-015/017/018、SEC-P02/P03、CON-004/006/007
> テスト戦略: Standard / 承認モード: autonomous(記録用、ユーザーゲートなし)

## ステップ(トレーサビリティ付き)

- [ ] **Step 1: tests/lib/setup-pack-contract.ts**(FR-018)— PackContract 単一定義: `declaredInFiles`(package.json files 由来: dist/cli.js, README.md, LICENSE-MIT, LICENSE-APACHE)と `autoIncluded`(npm が files 無視で同梱: package.json — 実測済み empirical fact)を分離して保持
- [ ] **Step 2: pack 契約テスト**(FR-018, tests/integration)— `npm pack --dry-run --json` を packages/setup に対して実行し、ファイル一覧が PackContract の**完全一致**(missing も unexpected も検出)であることをアサート。dist/cli.js は U1 の `ensureSetupCliBuilt()` で遅延取得(独自ビルドロジック禁止)
- [ ] **Step 3: ドリフトテスト**— package.json の files フィールド ↔ PackContract.declaredInFiles の同期をアサート(どちらか片方の変更を検出)
- [ ] **Step 4: 落ちる実証(team.md Mandated)**— files から LICENSE を一時除去して Step 2 が missing で赤くなることを1度実証 → 復元(記録は報告と code-summary へ。恒常テストとしては unexpected 検出ケース = src/*.ts 混入シミュレートを含める)
- [ ] **Step 5: publish 手順書**(FR-015)— `docs/guide/publishing-setup.md`(英語)を functional-design の7章立てどおり作成: 1 前提確認(R1 npm scope・vX.Y.Z タグ実在 CON-007・2FA auth-and-writes SEC-P02)/ 2 バージョンバンプ(FR-017 独立 semver)/ 3 ビルドと検証(bun build → typecheck/lint → CI プロファイル → **`AMADEUS_SETUP_E2E_NETWORK=1` で実ネットワーク E2E**)/ 4 ローカル最終確認(npm pack --dry-run 目視+tarball ローカル導入)/ 5 手動 publish(--access public / --tag next、**provenance なし注記** SEC-P03)/ 6 公開後検証(npx @amadeus-dlc/setup@<version> --help)/ 7 ロールバック指針(deprecate+パッチ版)
- [ ] **Step 6: 性能バジェット確認**— pack 実行は3回以内・合計 ≤28秒(nfr-design のバジェットモデル)。テスト実行時間を報告に記録
- [ ] **Step 7: 検証一式**— `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` / `bun run dist:check` / `bun run promote:self:check` 全グリーン(最終変更後に再実行、exit code 明記)

## スコープ外

- root package.json の I1/I2 是正・README 刷新・CHANGELOG・framework 版バンプ(U5 の「ユーザー可視 PR」に移管済み — CON-006)
- publish の実行そのもの(手動・タグ発行後 — 手順書ワークフロー)
- CI への publish/provenance 追加(CON-004)

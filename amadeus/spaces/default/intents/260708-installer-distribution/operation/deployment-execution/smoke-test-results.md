# Smoke Test Results — installer-distribution

> ステージ: deployment-execution (4.3) / 実行: 2026-07-09(全て実行結果由来)

## オフラインスモーク(配布物レベル)

| テスト | 結果 |
|--------|------|
| `tests/smoke/setup-cli-smoke.test.ts`(node/bun 両起動・FR-002) | PASS(--ci 実行に包含、フレッシュビルドで確認済み) |
| setup 全サブセット 27ファイル | 230 pass / 0 fail |
| e2e ティア(オフライン: フィクスチャ install/upgrade+NFR-001 計測) | PASS(--release --filter setup-) |

## 実ネットワーク E2E(release gate — AMADEUS_SETUP_E2E_NETWORK=1 で実行)

- 結果: **FAIL(期待される失敗)** — `Could not resolve a version to install: no stable release or tag was found`
- 根本原因(実測): `git ls-remote --tags origin` = **0件**、GitHub Releases API = **0件**。リポジトリに vX.Y.Z タグが一度も発行されていないため、resolver(ADR-003: Releases → tags)は正しく候補ゼロを報告し非0終了
- 判定: インストーラの動作は仕様どおり(誤動作ではない)。**v1.2.0 タグ発行後に本テストを再実行して PASS を確認することがリリース前提**(手順書章3)

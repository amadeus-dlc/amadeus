# Validation Report — installer-distribution

> ステージ: environment-provisioning (4.2) / 実施: 2026-07-09(実測)

## 検証結果

| # | 検証 | 方法 | 結果 |
|---|------|------|------|
| 1 | GitHub API 到達性(resolver の前提) | CI 上の実テスト+feasibility 時の実測(レジストリ照会) | PASS |
| 2 | GitHub Actions 実行 | PR #648〜#654 の5ゲート | PASS(全 PR グリーン) |
| 3 | npm pack 動作(公開前提のツールチェーン) | `setup-pack-contract.test.ts` の実 npm pack 3回 | PASS(~650ms) |
| 4 | 両ランタイム起動(利用者環境前提) | smoke テスト(node/bun 双方で dist/cli.js 起動) | PASS |
| 5 | npm org スコープ(R1) | — | **未検証(意図的)** — 公開前の人間タスク。手順書章1が publish 直前の確認手順を規定 |

## 判定

プロビジョニング対象ゼロの構成として**検証可能な項目はすべて実測 PASS**。残る R1 のみリリース手順内の人間確認事項

# Reliability Design — publish-readiness

> ステージ: nfr-design (3.3) / Unit: publish-readiness / 作成: 2026-07-08
> 出典: `../nfr-requirements/reliability-requirements.md`(REL-P01〜P03)・`tech-stack-decisions.md`、`../functional-design/domain-entities.md`(PackContract)

## REL-P01(決定性)の実装構造

- PackReport.parse は npm の `--json` 出力のうち **files[].path と version のみ**を読む(他フィールドの形式変動に影響されない最小依存パース)
- テストはネットワーク・環境変数・日時に依存しない(PackContract.current() は純定数、Date 不使用)

## REL-P02(3方向の赤の実証)の実装構造

- 実証は**一時コピーした package.json に対する変異**で行う(実物を書き換えない): fixture 用一時ディレクトリに packages/setup をコピー(**ビルド済み dist/cli.js を含めて** — performance-design の実行順序参照)→ files 配列を変異 → npm pack --dry-run を実行 → missing/unexpected の各検出をアサート(drift は npm 不要の別テスト)。この「変異フィクスチャ」テストは常設し、検出能力自体をリグレッション保護する
- **前提の明記**: `npm pack --dry-run` の files 列挙は当該 package.json と実ファイルのみに依存し、bun ワークスペースルートの文脈に依存しない(実行時依存ゼロ NFR-005 のため node_modules も lockfile も不要)。この前提自体を変異フィクスチャの1アサーション(実物と無変異コピーの列挙一致)として検証する — REL-P01 の決定性主張の根拠を実測化

## REL-P03(手順書の実行可能性)の実装構造

- 手順書の各コマンドブロックに「期待出力(要旨)」を併記する書式を統一。公開後検証の `npx @amadeus-dlc/setup@<version> --help` まで一本道

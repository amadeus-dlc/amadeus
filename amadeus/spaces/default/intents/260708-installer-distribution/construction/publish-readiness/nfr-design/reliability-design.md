# Reliability Design — publish-readiness

> ステージ: nfr-design (3.3) / Unit: publish-readiness / 作成: 2026-07-08
> 出典: `../nfr-requirements/reliability-requirements.md`(REL-P01〜P03)・`tech-stack-decisions.md`、`../functional-design/domain-entities.md`(PackContract)

## REL-P01(決定性)の実装構造

- PackReport.parse は npm の `--json` 出力のうち **files[].path と version のみ**を読む(他フィールドの形式変動に影響されない最小依存パース)
- テストはネットワーク・環境変数・日時に依存しない(PackContract.current() は純定数、Date 不使用)

## REL-P02(3方向の赤の実証)の実装構造

- 実証は**一時コピーした package.json に対する変異**で行う(実物を書き換えない): fixture 用一時ディレクトリに packages/setup をコピー → files 配列を変異 → npm pack --dry-run を実行 → missing/unexpected/drift の各検出をアサート。この「変異フィクスチャ」テストは常設し(一度きりの手動実証ではなく)、検出能力自体をリグレッション保護する

## REL-P03(手順書の実行可能性)の実装構造

- 手順書の各コマンドブロックに「期待出力(要旨)」を併記する書式を統一。公開後検証の `npx @amadeus-dlc/setup@<version> --help` まで一本道

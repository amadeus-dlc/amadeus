# Code Summary — docs-rollout(U5 / Bolt 5)

> ステージ: code-generation (3.5) / Unit: docs-rollout / 作成: 2026-07-09
> ビルダー: amadeus-developer-agent(codegen-u5)/ 全6ステップ完了

## 変更ファイル

手編集6種(変更対象表どおり): README.md(導入セクション刷新 — FR-014 の5要素、cp -r 撤去、4ハーネスのセットアップをワンライナー化)、CHANGELOG.md(`## [1.2.0] - 2026-07-09`)、root package.json(I1: license `(MIT OR Apache-2.0)`、I2: repository.url 是正+directory 削除)、amadeus-version.ts(1.2.0)、docs/guide/15-troubleshooting.md(cp -r フォールバック移設)。再生成: dist 4ハーネス+セルフインストールの VERSION/amadeus-version.ts(スクリプト経由のみ)

## 検証結果(ビルダー実行、exit code 付き)

t68(7 pass)/ typecheck / lint / dist:check / promote:self:check 全 exit 0。tests --ci は既知ベースライン(t92 のみローカル環境固有の赤)どおり

## ビルダー申告のスコープ判断(レビュー裁定待ち)

1. README のライセンスバッジ(`license-MIT--0`)は未変更 — 設計の変更対象表が「バッジ=版バンプ同期」のみ明記のため。ただし I1 是正により package.json と不一致が顕在化
2. root package.json の description が旧 cp -r 文言のまま — I1/I2 最小 diff の指示範囲外と判断

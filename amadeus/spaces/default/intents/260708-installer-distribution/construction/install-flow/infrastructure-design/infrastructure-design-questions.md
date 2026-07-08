# Infrastructure Design Questions — install-flow

> ステージ: infrastructure-design (3.4) / Unit: install-flow / 作成: 2026-07-08

## 質問なしの判断(Construction の質問は例外規定)

U2 は実行時の新規外部面を持たない(GitHub 通信は U1 経由、書き込みはユーザーのローカル対象ディレクトリのみ)。判断事項は E2E テストインフラの構成のみで、既存 tests/harness 流儀から導出可能。

未解決の曖昧さ: なし。

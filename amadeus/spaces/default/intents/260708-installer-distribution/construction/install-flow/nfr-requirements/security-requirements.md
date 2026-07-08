# Security Requirements — install-flow

> ステージ: nfr-requirements (3.2) / Unit: install-flow / 作成: 2026-07-08
> 出典: `../functional-design/business-rules.md`(BR-I 系)・`business-logic-model.md`(applier 書き込み境界)、U1 SEC-F01〜F04、construction フェーズ Security ルール

## SEC-I01: 書き込み境界の封じ込め(applier)

applier は **`--target` 配下にのみ**書き込む。プランエントリの相対パスを正規化し、target 外へ解決されるパス(`../`、絶対パス)は適用前に拒否する(U1 SEC-F01 の展開側防御に対する**適用側の二重防御**)。バックアップ(`.bk`)も target 配下に限定。

- 検証: target 外を指すエントリを含む不正プランのフィクスチャで applier が拒否することをテスト(落ちる実証)

## SEC-I02: 入力検証(cli 境界)

- `--target`: 実在ディレクトリまたは作成可能パスであることを検証。シェル展開・コマンド実行に渡さない(exec 不使用 — 全操作は fs API)
- `--harness`: `HarnessName.parse` の4値検証(BR-I05)
- ウィザード入力も同一の検証を通す(TTY 経路だけ緩い、を作らない)

## SEC-I03: 権限とエスカレーション

- 昇格(sudo 等)を要求・示唆しない。書き込み不能は権限エラーとして分類表示し、ユーザー判断に委ねる
- 実行ビットを付与しない(フレームワーク規約: ツール・フックは実行ビット不要)

## SEC-I04: 秘密情報

- 認証情報・トークンを扱わない(U1 SEC-F02 継承)。ログ・レポート・マニフェストにユーザー環境の機微情報(ホームパス以外)を書かない

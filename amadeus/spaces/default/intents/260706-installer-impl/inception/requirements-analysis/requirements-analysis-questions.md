# Requirements Analysis Questions

> Stage: requirements-analysis / Intent: installer-impl / Created: 2026-07-07T02:45:34Z

## Q1. プレフィックスなし共有ファイルの更新ポリシー

`.claude/settings.json`、`.codex/settings.toml` 相当、`CLAUDE.md` など、`amadeus-*` プレフィックスを持たないがフレームワークが管理する可能性のある共有ファイルは、`upgrade` の非破壊マージでどう扱うべきですか？

A. 安全側 — 既存ファイルがある場合は自動上書きせず、差分レポートに「手動確認」として出す
B. 管理リスト方式 — インストーラが管理対象リストを持ち、該当ファイルだけ構造的にマージまたは更新する
C. force のみ — 通常 upgrade では触らず、`--force` のときだけ上書きする
D. ハーネス別に分ける — claude/codex/kiro ごとに個別ルールを定義する
X. Other (please specify)

[Answer]: X. Other — 想定した md5 値と相違なければ上書きしてよい。変わっている場合は上書きできないため、`$namefile.$timestamp.bk` で退避してからコピーする。`$timestamp` はコピーごとの日時ではなくインストール時の日時であり、同一インストール内のすべてのファイルで同じ日時にする。

## Q2. 既定のバージョン解決

`bunx @amadeus-dlc/setup` または `npx @amadeus-dlc/setup` が取得する Amadeus 配布物の既定バージョンはどれにすべきですか？

A. 最新 GitHub Release / tag を取得する
B. npm パッケージ自身のバージョンと同じ GitHub tag を取得する
C. 明示 `--version` 必須にする
D. 初回は最新、upgrade は導入済みメジャー系列の最新にする
X. Other (please specify)

[Answer]: A. 最新 GitHub Release / tag を取得する

## Q3. `init` の既存ファイル衝突時の挙動

新規導入 `init` で、導入先に対象ハーネスのディレクトリや同名ファイルが既に存在する場合、既定ではどう振る舞うべきですか？

A. 中断して差分/衝突一覧を表示し、`upgrade` または `--force` を案内する
B. 非破壊で追加できるファイルだけ追加し、衝突ファイルはスキップする
C. 対話式なら確認して続行、非対話なら中断する
D. 常に `--force` なしでも上書きする
X. Other (please specify)

[Answer]: C. 対話式なら確認して続行、非対話なら中断する

## Q4. ネットワーク失敗・GitHub 取得失敗時の最小要件

GitHub tag archive 取得が失敗した場合、初回リリースで最低限必要な挙動はどれですか？

A. 明確な原因分類と再実行案内のみでよい
B. 1回だけ自動リトライし、それでも失敗したら原因分類を出す
C. 複数回リトライ + exponential backoff まで実装する
D. 代替 URL / mirror 指定フラグまで実装する
X. Other (please specify)

[Answer]: B. 1回だけ自動リトライし、それでも失敗したら原因分類を出す

## Q5. 非対話モードの必須引数

CI やスクリプトで非対話実行する場合、どの引数を必須にすべきですか？

A. `--harness` のみ必須。バージョンとターゲットは既定値を使う
B. `--harness` と `--target` を必須。バージョンは既定値を使う
C. `--harness`、`--target`、`--version` をすべて必須にする
D. `--yes` があれば不足分は安全な既定値で補う
X. Other (please specify)

[Answer]: B. `--harness` と `--target` を必須。バージョンは既定値を使う

## Q6. 成功検証の下限

インストーラが「成功」とみなすための導入後検証は、初回リリースではどこまで必要ですか？

A. ファイル存在検証のみ — 選択ハーネスの必須ファイルが配置されたことを確認
B. ファイル存在 + `/amadeus --doctor` 相当の起動前提チェック
C. ファイル存在 + dist/self-install drift guard 相当のバイト一致検証
D. ファイル存在 + 最小 `/amadeus --help` 実行確認
X. Other (please specify)

[Answer]: B. ファイル存在 + `/amadeus --doctor` 相当の起動前提チェック

## Q7. npm 公開整備の範囲

初回リリースで npm 公開整備として必ず含める範囲はどれですか？

A. package metadata、bin、license/repository 修正、README/CHANGELOG 更新まで
B. A に加えて npm publish 手順書まで
C. B に加えて GitHub Actions での自動 publish まで
D. package metadata と bin のみ。docs は後続に回す
X. Other (please specify)

[Answer]: B. A に加えて npm publish 手順書まで

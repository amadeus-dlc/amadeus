# Security Design — U1 tla-externalize

上流: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## 信頼境界

- asset境界はrepository root配下の`specs/tla/FormalElection.tla`、`.cfg`、`model-map.json`に固定する。`import.meta.url`から祖先を上り、`.git` file/directory、root `package.json`、`specs/tla/`を同時に持つ最寄り祖先をrootとする。該当なしはfail-closedにし、`cwd`、CLI引数、環境変数はroot解決に使用しない。
- implementation-entry境界は別に定義し、`model-map.json`の相対pathをrepository rootへ解決した後、realpathが選挙実装の正本`<root>/packages/framework/core/tools/`内にあり、basenameが`amadeus-election` prefixを持つregular fileだけを許可する。absolute path、`..`、symlink、root外realpath、重複entry、不正SHA-256を拒否する。生成先`dist/`やself-install先は登録対象にせず、正本からの配布同期はFR-6.1の別ゲートで検証する。
- asset pathもrealpath後に`<root>/specs/tla/`包含とregular fileを検査し、locatorが発行した検証済みpathだけをloaderへ渡す。
- モデルと登録簿は公開設計資産として扱い、credential、環境変数、host pathをreceiptやerrorへ含めない。

## 完全性と失敗

- bytes取得後に既存`canonicalIdentity`とSHA-256を計算し、期待値不一致は`SOURCE_DRIFT`としてfail-closedにする。
- 不在、空、読取不能、不正JSONは固定`ModelLoadError` codeへ分類し、埋め込みfallbackや検証skipを持たない。すべての外部表示ではrepository相対pathだけを使う。
- 新規dependency、認証、暗号化保存は導入しない。Git review、commit履歴、CI結果を変更証跡とする。

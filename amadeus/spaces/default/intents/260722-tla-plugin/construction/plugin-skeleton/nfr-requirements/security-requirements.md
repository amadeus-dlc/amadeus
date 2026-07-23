# Security Requirements — U2 plugin-skeleton

上流入力: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## Plugin 境界

- stage pathはhostRoot配下の`plugins/<name>/stages/<slug>.md`に限定する。hostRootを`realpath`し、各祖先と末端のsymlinkを拒否、regular-file確認、case-sensitiveなPOSIX相対化を行い、列挙直後とread直前のdev/inode一致を検証してTOCTOUをfail-closedにする。
- slug衝突、読取不能、schema不正、未知sensor idはloud rejectする。
- compose/dropの既存workspace lock、journal、宣言物限定、上書き禁止契約を維持する。

## 信頼モデルと権限

- plugin Markdownは、利用者がローカルで内容をレビューして明示composeした後に限りtrusted codeとして扱う。未compose、署名やprovenance不明、workspace外由来のstageをengineは実行しない。
- plugin stageは現在のCodex/CLI権限を超える権限を得ず、network・secret・外部writeはstage bodyの明示宣言と人間承認なしに行わない。認証・認可・個人データ・規制データは本Unitに非該当。

## 供給網

- plugin READMEにローカルJDK/sandboxとCI Docker digest/jar checksumの依存を明記する。
- pluginは秘密情報を内包せず、network取得や任意scriptをcompose時に実行しない。

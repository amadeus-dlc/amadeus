# Integration Test Instructions — 260726-plugin-host-delivery

> 上流入力(consumes 全数): code-generation-plan、code-summary — 各ユニットの code-generation-plan.md「実装順序」と code-summary.md「変更ファイル」から本 intent の integration テスト集合(実 FS・実 CLI 境界)を棚卸しした。

## 実行方法

- integration 層: `bash tests/run-tests.sh --integration`、フル: `bash tests/run-tests.sh --ci`
- 実 FS(mkdtemp)・実 subprocess を使う層。tempdir 隔離で実 record/audit を汚染しない

## 本 intent の integration テスト(実在棚卸し — ls 転記)

| ユニット | テスト | 検証境界 |
|---|---|---|
| U2 | t299-plugin-cli-walking-skeleton、t302-plugin-cli-failure-branches、t303-plugin-projection-harness | compose/drop/doctor E2E、失敗分岐、claude 投影+出力先安全 |
| U3 | t307-install-artifacts-classes、t308-project-all-harnesses、t309-outdir-refusal、t310-check-plugin-projections、t311-zero-plugin-byte-identical、t312-writebundle-outdir-refusal | 7面投影・INSTALL.md・OutDirRefusal の本番書込経路発火・0-plugin byte-identical |
| U5 | t315-doctor-plugin-observability | --doctor plugin 節の exit 集約(loud fail / visible-passing) |
| U6 | t320-activation-spec-hash、t321-activation-engine-seams、t322-activation-lifecycle-behaviour | spec-hash advisory・engine 配線・lifecycle(ADR-1 案A) |
| U4 | t326〜t328(hook 配線)| 5面 adapter の auto-compose 実起動(t328 は実 adapter ファイル spawn — manifest/CLI 直叩きの代替禁止) |
| U7 | t335-conformance-trace-machine-check、t338-conformance-recompile-selfheal | 追跡表の機械検査・recompile self-heal vs --if-stale |

## クロスユニット相互作用

- 統合ツリー(全8ユニットマージ後)でフルスイートを実行し、単体 green では見えない交差(dist 投影 drift、t199 prefix 検査、t258 boundary 検査)を検出する — 本 intent で実測 3 件(formal-model-check 投影 drift、t188-trace の t199 検出、conformance-report 参照の t258 検出)を統合段で捕捉・是正済み

## 外部依存

- 外部サービス依存なし(GitHub API 等は本 intent のテスト対象外)

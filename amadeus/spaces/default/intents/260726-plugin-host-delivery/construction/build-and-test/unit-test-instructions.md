# Unit Test Instructions — 260726-plugin-host-delivery

> 上流入力(consumes 全数): code-generation-plan、code-summary — 各ユニットの code-generation-plan.md「実装順序」節と code-summary.md「変更ファイル」節から本 intent の新規 unit テスト集合(t300-t337 の unit 層)を棚卸しした。

## フレームワークと実行方法

- ランナー: `bun test`(自作ラッパ `tests/run-tests.sh` が smoke/unit/integration/e2e の4層を統率)
- unit 層のみ: `bash tests/run-tests.sh --unit`、単一ファイル: `bun test tests/unit/<file>`
- 純関数層のみを unit に置く(実 FS/process を使うものは integration — test-size classification ratchet が機械強制)

## 本 intent の unit テスト(実在棚卸し — ls 転記)

| ユニット | テスト |
|---|---|
| U2 walking-skeleton | t300-plugin-cli-args、t301-plugin-cli-seams |
| U3 host-projection-all | t304-classify-outdir、t305-projection-hash、t306-plugin-host-class |
| U5 doctor-observability | t313-doctor-plugin-section、t314-doctor-plugin-rows |
| U6 activation-policy | t319-activation-judgment |
| U4 hook-wiring-remaining | t325-face-disposition |
| U7 conformance-suite | t336-conformance-report-section、t337-conformance-fragment-order |

## カバレッジ目標(Comprehensive)

- 追加ソース行の patch カバレッジ: DA:0 = 0(機械照合済み — build-test-results.md 参照)
- CLI ハンドラは in-process seam(handlePluginCli 等の export)で駆動し spawn 盲点を作らない

## テストデータ

- fixture は各テストの in-memory 定義または tests/harness/fixtures.ts の決定的 fixture を使用。手動セットアップ不要

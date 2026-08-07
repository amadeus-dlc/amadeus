# Unit Test Instructions — 260807-failclosed-recovery-path

上流入力(consumes 全数): 各 unit の `code-generation-plan.md`(テスト設計と Red 実測の記録)と `code-summary.md`(実装した seam と検証実績)。対象テスト集合は3 unit の code-summary.md の FR 対応表から機械転記した。

## 対象テストと実行方法

Comprehensive 戦略だが、テストは承認済み FR/NFR へ trace できる集合のみを対象とする(戦略名による機械追加はしない)。ランナーは `bun test`(必要に応じ `tests/run-tests.sh` プロファイル)。

| Unit | テスト | trace |
|---|---|---|
| fix-2313-reconcile-freshness | `tests/no-silent-drop/t413-*`(evidence 鮮度)/ `t427`(landing drift 2値)/ `t466`(canonical 縮退) | FR-1.1〜1.4 |
| fix-2330-advisory-store-recovery | `t470`(recover-schema-1、14 tests — CLI spawner + in-process seam)/ `t458` 無改変 green | FR-2.1〜2.5 |
| fix-2358-unit-done-declaration | `t480` unit + `t480` integration(宣言 writer/reader/decision)/ `t367` test 13a/13b/14 | FR-3.1〜3.6 / AC-3a〜3e |

実行前に全 path の実在を配列展開で機械確認し、実行後に `Ran ... across M files` と期待ファイル数を照合する(`cid:build-and-test:test-path-set-completeness` / `bt-path-existence-array-expansion`)。

## カバレッジ目標

- 正規判定は PR CI の Project Coverage Gate(絶対下限 AND 相対低下幅)+ Patch Coverage Gate(`cid:code-generation:local-lcov-pre-push`)。3 Bolt の PR(#2387/#2389/#2392/#2393)はいずれも CI green でマージ着地済み — 本ステージではローカル focused 再実行で退行有無のみ確認する。

## テストデータ

- t470 は一時ディレクトリに schema 1 store fixture を生成する自己完結型。t480 integration は record レイアウトを scratch に構築する。手動セットアップは不要。

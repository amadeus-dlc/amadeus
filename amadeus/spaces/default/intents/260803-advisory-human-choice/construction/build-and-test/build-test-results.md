# Build and Test Results — advisory-human-choice

## 判定

- **変更固有の品質判定**: PASS
- **full regressionの最終生結果**: BASELINE EXCEPTION（769 files中2 files、10468 assertions中2 assertions。1件は単独再実行PASS、1件は未変更のbranch topology不整合）
- **Build-ready**: Yes
- **Test-ready**: Yes
- **Deployment-ready**: 人間のBuild and Test承認後にYes

本変更に相関する失敗、skip、timeoutは0件である。full regressionの唯一の失敗は、未変更の`tests/integration/t413-no-silent-drop-ci-adoption.test.ts`が、現在のHEAD `498c3034a78bd432dc426f9f807b79c8ae980762`の祖先ではない証跡revision `fc49f8de26f85c56ddc7ba94ee7522276ed3ec60`を要求する既存のbranch topology不整合である。単独120秒再実行でも同じ1 assertionだけが失敗し、本変更の実装・テスト対象とは独立している。

## 上流成果物

- `construction/advisory-human-choice/code-generation/code-generation-plan.md`
- `construction/advisory-human-choice/code-generation/code-summary.md`
- `construction/formal-model-check/memory.md`
- GitHub Issue [#2129](https://github.com/amadeus-dlc/amadeus/issues/2129)

上流で定義されたadvisory checkpoint、protected human choice receipt、Formal Model Check成果物相関、7 harness projectionを検証した。

## 修正前の回帰検出と是正

最初のfull regressionは769 files中3 files、10465 assertions中3 assertionsが失敗した。うち変更起因の2件を次のとおり是正した。

1. `tests/unit/complexity-gate.test.ts`: 新規関数の複雑度超過をhelper分割で解消した。最終結果は「0 new violations、0 regressions、baseline 33、threshold 15」である。
2. `tests/unit/t-test-size-drift.test.ts`: filesystemを使う新規テストをunitからintegrationへ移し、`// size: medium`を付与した。
3. `tests/integration/t413-no-silent-drop-ci-adoption.test.ts`: 未変更の証跡revisionとHEADの非祖先関係による既存失敗。変更せずbaseline exceptionとして記録した。

最初の是正後focused regressionは11 files、181 tests、526 assertionsが12.42秒で全件PASSした。品質gateを含む追加再実行は8 files、187 tests、462 assertionsが全件PASSした。

人間承認時に`1`が未クローズadvisoryの2回目の`run-now` receiptとして誤記録され、存在しないretry attemptを要求する回帰を実動作で検出した。次を追加是正した。

1. model check未実行待ちまたは検証済み`NOT_DETECTED`の後は、新しい`1`を同一advisoryのreceiptとして記録しない。
2. 旧adapterが検証済みattempt後に重複receiptを残した状態でも、検証済みattemptを無効化せず安全に回復する。
3. `DETECTED`、`HARNESS_ERROR`、不正成果物の後だけfresh retry/deferを引き続き許可する。

追加した3回帰テストを含む最終focused regressionは11 files、184 tests、541 assertionsが13.67秒で全件PASSした。

## Full regression

```text
Command: bun tests/run-tests.ts --ci --test-timeout-ms 120000 --verbose
Log: tests/logs/2026-08-03T14-17-46Z
Files: 769
Failed files: 2
Assertions: 10468
Failed assertions: 2
Elapsed: 約6分36秒
```

`tests/integration/t-codex-exec-live-helper.test.ts`のtrust失敗時cleanup assertionは、同一fileの120秒単独再実行で3/3 PASSした。変更対象外であり、並列実行時の一時directory cleanup競合と分類した。

`tests/integration/t413-no-silent-drop-ci-adoption.test.ts`は単独再実行でも9 testsがPASSし、`git merge-base --is-ancestor fc49f8de... 498c3034...`を検証する1 testだけがFAILした。対象test、`tests/no-silent-drop/adoption-evidence.json`、および失敗条件は本変更で編集していない。

## Buildと静的検証

| 検証 | 結果 |
|---|---|
| `bun run typecheck` | PASS |
| `bun tests/complexity-gate.ts --check` | PASS（新規違反0、回帰0） |
| `bun scripts/package.ts --check` | PASS（7 harness同期） |
| `bun run promote:self:check` | PASS |
| `bun run distribution:check` | PASS（412 payloads、4 docs、416 files） |
| `git diff --check` | PASS |
| `bun run lint` | exit 0（既存warning 394件、info 23件、新規blocking errorなし） |

正本修正後に`bun scripts/package.ts`と`bun run promote:self`を実行し、生成treeを再同期した。

## Formal Model Check

| 項目 | 結果 |
|---|---|
| runId | `7c93be4a-280d-4ab5-b5f3-60b46d9de24b` |
| outcome | `NOT_DETECTED` |
| complete / partial | `true / false` |
| exitCode | `0` |
| advisory target | `specs/tla` |
| spec identity | `sha256:830732792893e951de0c22c5812d76726126daba652e4a6f8e0f6821df4d42ac` |
| instance | `c91aea85-9c50-4d6a-a46d-c1863e5659df` |

manifestのexpected artifacts 4件はすべて存在し、manifest記載digestと実体が一致した。source provenanceは`FormalElection.tla`と`FormalElection.cfg`のmodule/cfg identityおよびSHA-256に相関し、partial publish、欠損、別target、別spec、別instanceは受理していない。

## Security検証

protected receiptのwriterは、正本上で次の2経路だけである。

1. `packages/framework/core/hooks/amadeus-mint-presence.ts`
2. `packages/framework/harness/codex/hooks/amadeus-codex-adapter.ts`

一般CLI/APIから任意receiptを書ける経路はなく、raw prompt本文や秘密情報はreceipt・監査へ保存しない。receiptなし、machine-injected prompt、非列挙choice、turn再利用、stale/別identity、Formal Model Checkのincomplete・digest不一致・`DETECTED`・`HARNESS_ERROR`を拒否するnegative testは全件PASSした。

## Performance適用性

明示的なlatency、throughput、capacity NFRはないため、load・stress・soak testは非適用とした。短命CLI/hookに新しい無限待機、deadlock、変更相関timeoutはなく、Formal Model Checkは109.534秒でcompletion markerを伴って完了した。性能値は合否閾値には用いていない。

## センサー結果

Build and Testの7成果物すべてについて、`required-sections`と`upstream-coverage`の最新terminal resultがPASSである。更新した成果物は更新後に2センサーを再実行し、監査へ記録した。

## §13 学習ゲート

`amadeus-learnings.ts surface --slug build-and-test`は`memory_entries_total: 0`、候補0件、未解決質問0件を返した。`auto-solo-election`により選挙`E-260803-AHC-BT-S13-Z0`を実施し、独立した2投票者がともに「0件で可」、GoA 1、留保なしで投票した。選挙はtally、render、verifyを経て`recorded`となり、永続化するpracticeまたはsensorはない。

## 残存リスク

- `t413`のcanonical evidence revisionを現在のbranch履歴へ整合させる作業は、本self-fixの変更範囲外である。
- 人間のchoiceに対する物理presence保証は各harness adapterに依存する。今回変更したCodex adapter経路はprocess境界testで検証済みである。

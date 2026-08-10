# Code Summary — population-interval-accounting

## 実装結果

- Source: `packages/framework/core/tools/amadeus-stage-attribution-intervals.ts`（445行）
- Test: `tests/unit/t486-stage-attribution-intervals.test.ts`（448行）
- Commit: `e07e85450df6ff6e2a24729ed54bf3fe3f56bcbe` (`feat(stage-stats): add interval population accounting`)
- Intent branch integration commit: `6c6f77916`
- Domain contract fix: `ffefc3cdd16853d82a494e698ff9ac8172fe5abc`
- Review fix: `40c7407bf4bbce4b5193c147c17ee5ebca5348d7` (`fix(stage-stats): reuse domain population errors`)
- Batch 2 referee: `converged=true`、`tampered=false`

half-open integer-second interval algebra、intent別idle index、same intent/stageの全window matching、candidate単一disposition、複数window contribution、category/global union、residual/ratio accounting、population invariant transactionをpure moduleとして実装した。event decode、statistics、outlier、renderer、filesystem/processには依存しない。

## 検証

- U-01 + U-03 focused regression after review fix: 26 pass / 0 fail
- fast-check: 100 runsを含む
- Repository typecheck: pass
- Repository lint: exit 0（既存454 warnings、既存info 16、所有2ファイルはdiagnostic 0）
- Full `test:ci`: 939 files中2件が初回失敗。`t07`は300ms負荷揺らぎ（308.873ms）で120秒timeout単独再実行16/16 pass、`t150`はsource-only worktreeのbuild前dist差分でbuild後単独再実行10/10 pass。U-03と`t487` stage-stats integrationは初回からGreen。

## Error contract整合

U-01の`AccountingInvariantError`をformal ownerとして、duplicate candidate、idle canonicality、net mismatch、overflow、population bijectionを表す`invalid-population-accounting` variantと16 invariantを追加した。U-03独自error shapeは削除し、accepted method contractどおり`AttributionResult<AttributionPopulationAccounting, AccountingInvariantError>`を再利用する。これにより情報を失わず、U-01 domain ownershipとconsumerのclosed unionを一致させた。

## Scope保持

U-03 は interval/accounting の supporting slice だけを完了した。Issue #2695 の FR 25件、NFR 7件、完了条件1〜10は U-04とBuild and Testを含む全体mappingに保持され、stage全体またはIntent全体の完了を意味しない。

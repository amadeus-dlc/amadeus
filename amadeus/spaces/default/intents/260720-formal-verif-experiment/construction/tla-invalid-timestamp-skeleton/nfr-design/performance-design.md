# Performance Design — tla-invalid-timestamp-skeleton

## 上流と budgets

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。local attempts=2、CI rows=2、各TLC<=120秒を固定する。

## SkeletonExecutionBudget

`SkeletonCoordinator` はCompositionHeadをrevision開始時に1回作り、各run前のHEAD/tree/clean検証時間をpreparation receiptへ分離する。local attemptsをserialにexactly 2実行し、first failureまたはsemantic mismatchで後続fan-outを停止する。U3/U4のstream/bundle capとterminate/killを緩和しない。

CI workflowは10分、poll 5秒×120、metadata connect/body 10/30秒、artifact connect/body 10/120秒、same-run transport attempts最大3に閉じる。別run retryは新revisionとする。

## Reservation と acceptance

2 local bundles + archive 128 MiB + uncompressed 72 MiB + 1 GiBをowner-identified lock下でphysical reserveし、ACTIVE claimと同一transactionでpublishする。terminal successor後にphysical release、再検証、RELEASED receiptで閉じる。

合否はlocal spawn=2、CI rows=2、counterexample identity=1、CompositionHead=1、poll<=120、transport attempts<=3、failure後fan-out=0である。


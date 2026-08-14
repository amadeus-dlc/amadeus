# merge queue の auto-merge 後、self record の pr-convergence report を最終化する経路が存在しない

## 概要

`pr-convergence-cli.ts` は self record(自 intent の record)に対し、PR が MERGED(評価 kind = landed)になると `report` / `override` を含む全 verb を `landed is not convergence evidence` で拒否する(`:1364-1366`)。一方 `pr-convergence-report-format` センサー(blocking)は pr-convergence ステージで kind `converged` または `override` を要求し、`created` と `landed` を最終収束として認めない。その結果、**merge queue の auto-merge が `report`(converged)実行より先に着地すると、ステージ完了が構造的に不可能になる**。

## 再現(実測、intent 260814-plugins-rename-drift)

1. PR #3051/#3052/#3055 を人間事前承認の auto-merge(merge queue)で着地(必須 CI green 時に自動)
2. `pr-convergence-cli.ts report --repo amadeus-dlc/amadeus --pr 3051 --unit rename-github-pr-convergence --record <record>` → exit 1 `landed is not convergence evidence`
3. `pr-convergence-cli.ts override ...` → 同上(override 分岐へ到達する前の :1364 ガードで拒否)
4. `amadeus-sensor.ts fire pr-convergence-report-format --stage pr-convergence ...` → pass:false、reason "created proves PR delivery only; final convergence requires converged or override"
5. `amadeus-state.ts approve pr-convergence` → blocking sensor 未解決で拒否

## 期待 vs 実際

- 期待: マージ済み(landed)は predicate 上「記録する事実」であり(pr-convergence-predicate.ts の landedVerdict)、self record でも landed 事実を最終記録としてステージを閉じられる
- 実際: self record では landed が全 verb 拒否となり、blocking sensor と合わせてデッドエンド。逃がしは `AMADEUS_SKIP_BLOCKING_SENSOR_GUARD=1` のみ

## 受け入れ条件

1. マージ済み PR の self record に対する最終化経路を定義する(例: landed 事実の self report 書込を許可しセンサーが pr-convergence ステージで landed+merge commit 検証付きを合格にする、または override を landed でも許可)
2. 落ちる実証: merged PR で最終化 → sensor pass、未 merge・未収束では従前どおり fail
3. auto-merge(queue)運用と report 実行順序の契約を stage 文書に明記

## 影響

merge queue + auto-merge を使う全ワークフローで pr-convergence ステージが escape hatch なしで完了不能。ゲートの信頼性(escape の常用化)を毀損する。

# code-generation-plan: fix-841-swarm-batch-progress

## 対象バグ
Issue #841 (P1/S2): `tryEmitSwarm` が完了バッチを除外せず静的 `batches[0]` を無条件再提示する。

- 欠陥所在: `packages/framework/core/tools/amadeus-orchestrate.ts` の `tryEmitSwarm`(:1703-)、欠陥本体 :1717-1720。
  `readBoltDagBatches` の結果から `batches[0]` を無条件採用しているため、バッチ1が merge 済みでも `next` のたびにバッチ1を再提示し、swarm がバッチを進めない。

## 元修正の契約(3eca83a56 / #486)
- `bolt_dag.batches` は静的トポロジ。完了バッチはここで除外しなければならない。
- coverage は per-unit ループと同一の ledger(`unitCovered` = stage の `produces[]` がディスクに実在)を使う。bolt 名の相関は不要。
- batches を順に走査し、未カバー unit を含む**最初の**バッチを選び、そのバッチの**未カバー unit のみ**を提示する。
- 全バッチの全 unit が covered なら `firstBatch === null` → `return false` に落とし、`emitPerUnitRunStage` の all-covered 再入(実ゲート提示)へフォールバックする。

## 現行適合点(差分再接地)
1. `tryEmitSwarm` のシグネチャに `recordPrefix: string | null` と `codekbCtx: CodekbCtx` を追加する(元修正と同一)。
   - 呼び出し2箇所(:1643 currentSlug 経路、:1669 next.slug 経路)は既に `recordPrefix`・`codekbCtx` がスコープ内にあるため引数追加のみ。
2. 現行の `unitCovered(projectDir, node, unit, recordPrefix, codekbCtx)` は元修正当時と同一シグネチャ・同一意味論(produces 実在判定)。そのまま流用する。
3. `const firstBatch = batches[0]` の無条件採用を、batches を走査して未カバー unit を含む最初のバッチの未カバー unit を選ぶループへ置換。全カバーなら `return false`。
4. ヘッダーコメント(:1691「emits `{kind:"invoke-swarm", units: batches[0]}`」)と、他関数の rationale コメント(:2690「tryEmitSwarm emits batches[0]」)を実挙動に合わせて accuracy 更新(coupled to この変更)。

## 契約同等性
元修正のロジック(batches 順走査 → `batch.filter(u => !unitCovered(...))` → 最初の非空 uncovered を採用 → 全カバーで false)を verbatim に現行コードへ移植する。相違は node 変数名の直接使用(元は `nodeForCoverage = node` の別名を介したが、現行は `node` を直接渡す — 意味同一)のみ。

## テスト方針(in-process seam 優先)
- 既存 t2xx 連番規約に従い新規 unit テストを追加。
- `tryEmitSwarm` は module-private のため、CLI/directive 経路(`next`)を in-process で駆動して invoke-swarm directive の `units` を観測する seam を用いる。fixture として bolt_dag(2バッチ)と autonomous state、produces 実在ファイルを用意。
- 必須2ケース:
  - (a) バッチ1全 unit covered fixture → バッチ2が提示される(invoke-swarm units = バッチ2)。
  - (b) 全バッチ covered fixture → invoke-swarm 提示なし(run-stage all-covered gate へフォールバック)。

## 落ちる実証
修正を一時 revert(batches[0] 版)した状態で新テストが RED になることを実測し、修正適用で GREEN を実測。code-summary に RED/GREEN ログを記録。

## 検証
typecheck / lint / dist:check / promote:self:check / complexity-gate / 新規+関連テスト / gen-coverage-registry --check を最終変更後に全再実行し exit code を記録。dist/self-install は同一コミットに同期。

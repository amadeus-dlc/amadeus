# mode × 確認ポイント マトリクス(実装導出)— unit docs-norms

> R-1(FR-14)の照合面。**実装が正本**であり、本表は実装から一方向に導出する(R-4)。
> 測定 ref: worktree `bolt-docs-norms`、base `swarm-int-rfc0001 @040196a11`(RFC-0001 実装 12 unit 統合後)。
> file:line はすべて `packages/framework/core/` からの相対パスで、起草時に実読して固定した。
>
> 列の意味 — `full(対話)` = 本セッションの clone 監査シャードに `HUMAN_TURN` が 1 件以上ある実行、
> `full(非対話)` = それが無い実行(`resolveSessionInteractivity`、amadeus-intent-autonomy.ts:143-155。
> 読み取り不能は非対話へ fail-closed)。semi は対話/非対話の別を持つ確認ポイントでは full と同じ挙動になる
> ため、差がある行のみ semi 列に両者を併記する。

## 表

| # | 確認ポイント | none | semi | full(対話) | full(非対話) | 決定する実装 |
|---|---|---|---|---|---|---|
| 1 | ステージゲート(phase 内) | 人間が承認 | 自動 | 自動 | 自動 | `tools/amadeus-intent-autonomy.ts:735,739-741`、`tools/amadeus-intent-autonomy-production.ts:97-108` |
| 2 | フェーズ境界ゲート | 人間が承認 | 人間が承認(milestone) | 自動 | 自動 | 同上 + `tools/amadeus-intent-autonomy.ts:800-805`(scope に載っていても milestone は決めない第 2 ガード)。auto 承認でも phase-check 成果物は必須 |
| 3 | walking-skeleton ゲート | 人間が承認 | 人間が承認(milestone) | 自動 | 自動 | 同上 + stance 従属 `tools/amadeus-intent-autonomy-production.ts:119-133,238-247`、`tools/amadeus-intent-autonomy.ts:35`。Skeleton Stance が `off` に解決される scope では ceremony 自体が発火せず、その stage は行 1 / 行 2 として扱われる |
| 4 | Intent 完了(最終フェーズ境界) | 人間が承認 | 人間が承認(phase-gate 種) | 自動 | 自動 | `tools/amadeus-state.ts:3743`(次 stage 不在 → `phaseBoundary`)+ 行 2 と同一経路 |
| 5 | ステージ内の明確化質問 | 人間が回答 | 自動(裁定順序) | 自動。不一意なら人間裁定 | 自動。不一意なら waiting 中断 | `tools/amadeus-intent-autonomy.ts:1156-1207`、`tools/amadeus-intent-autonomy-runtime.ts:585-586`、対話側 carveout `hooks/amadeus-stop.ts:501-526`、非対話側 `tools/amadeus-intent-autonomy-runtime.ts:765-798` |
| 6 | remote write(push / PR 作成等) | 人間が承認 | 自動(decide-question 経由) | 自動。`human-required` は人間 | 自動。`human-required` は waiting 中断 | `amadeus-common/protocols/stage-protocol.md` §11c、効果の天井 `tools/amadeus-intent-autonomy.ts:662-669,1229-1234` |
| 7 | PR マージ | 人間が裁定 | 人間が裁定 | 人間が裁定 | 人間が裁定 | mode 分岐なし(実装に mode arm が存在しない)。委任成立時の記録のみ `tools/amadeus-merge-provenance.ts:1-11`(record-only) |
| 8 | 仕様変更・goal 改訂 | 人間が裁定 | 人間が裁定(対話)/ waiting 中断(非対話) | 同左 | 同左 | 裁定順序 1 `tools/amadeus-intent-autonomy.ts:1154,1163`(`humanReservedDecision` が非 null なら導出前に escalate) |
| 9 | 選挙 hold | 人間が裁定 | 人間が裁定(対話)/ waiting 中断(非対話) | 同左 | 同左 | `tools/amadeus-intent-autonomy-production.ts:880-886`(hold → `contested` / `none`)→ 裁定順序 3 |
| 10 | §13 学習選定 | 人間が裁定 | 自動 | 自動 | 自動 | 発火は mode から導出 `tools/amadeus-config.ts:82-84`、`tools/amadeus-election.ts:264`。候補 0 件は digest 束縛の確認で儀式を開かない `tools/amadeus-learnings.ts:277-330` |
| 11 | code-gen 失敗 | 停止して人間が裁定 | 停止 → 選挙で裁定 | 停止 → 選挙で裁定 | 停止 → 選挙で裁定 | 停止自体は mode 非依存。裁定者は導出 trigger `tools/amadeus-orchestrate.ts:4178` |
| 12 | 品質修復ループ | 現行維持 | 自動修復 | 自動修復 | 自動修復 | `tools/amadeus-bolt.ts` observe-quality。修復不能は `REPAIR_STALLED` で停止 `tools/amadeus-intent-autonomy.ts:119` |
| 13 | Grill me | 提供 | 非提供 | 非提供 | 非提供 | `amadeus-common/protocols/stage-protocol.md`(Q12 未決のため現行維持) |
| 14 | GitHub ミラー・finding 起票 | consent 軸の設定に従う | consent 軸の設定に従う | consent 軸の設定に従う | consent 軸の設定に従う | mode 非従属 `tools/amadeus-config.ts:585,603`(`intent-mirror.github.issue.consent` / `finding.github.issue.creation.consent`) |
| 15 | park | いつでも可 | いつでも可 | いつでも可 | いつでも可 | mode arm 撤去 `tools/amadeus-state.ts:1577-1588`(presence の会計は不変) |
| 16 | swarm バッチ終端 | 人間が承認 | 自動 | 自動 | 自動 | `tools/amadeus-intent-autonomy.ts:56-58`、`tools/amadeus-orchestrate.ts:2077-2083`。none の承認は presence 必須 `tools/amadeus-bolt.ts:1252-1253`、`tools/amadeus-lib.ts:3964` |
| 17 | advisory(実行/延期) | 人間が選択 | 実行は自動、延期は人間 | 実行は自動、延期は人間 | 実行は自動、延期は人間 | 効果分類 `tools/amadeus-intent-autonomy.ts:662-669`、`tools/amadeus-advisory-choice.ts:294-305`。無人解決は `run-now` のみ `tools/amadeus-advisory-choice.ts:382-393` |
| 18 | goal 改訂 | (行 8 に統合) | — | — | — | — |
| 19 | intent birth / compose 承認 | 人間が承認 | 人間が承認 | 人間が承認(ターンを返す) | 人間が承認(carveout せず継続上限で終端) | `hooks/amadeus-stop.ts:552-590`(marker + interactivity 束縛) |
| 20 | Stop hook 継続上限 | 2 | 8 | 8 | 8 | `hooks/amadeus-stop.ts:154-161` |

## 実装が RFC ToBe と一致していない箇所(申し送り)

- **行 17**: RFC-0001 ToBe 表は semi/full を「延期も自動裁定可」とするが、着地した実装では
  `advisory-deferral` が autonomous 効果分類に入った(効果の天井は通る)一方で、無人解決の
  translate 層が `run-now` 以外を `human-required` に落とす(`tools/amadeus-advisory-choice.ts:382-393`
  — 逐語コメント「FR-ADV-4's PRIMARY barrier is untouched」)。本表は R-4 に従い**実装の挙動**を記す。
  RFC 側の意図まで揃えるかは別裁定(未実装の挙動を文書が先行記述しない)。

## 機械照合面

下の fenced YAML が t3116-docs-mode-matrix.test.ts の読む正本。各 check は
(a) 上の表の該当セルが同じ判定語で始まること、(b) 実装定数から導いた期待値と一致することの
両方を要求する。どちらか一方だけを書き換えても赤くなる。

`kind` が `InteractionKind`(stage-gate / phase-gate / walking-skeleton / question)の場合の期待値は
`nonAutoDecidedKinds(mode)` に含まれるなら `human`、含まれないなら `auto`。
`kind: swarm-batch-end` の場合は `projectConstructionAutonomy(mode) === "autonomous"` なら `auto`、
`gated` なら `human`。

```yaml
schema: mode-matrix-checks/1
checks:
  - id: none-stage-gate
    row: "1"
    column: none
    mode: none
    kind: stage-gate
    behaviour: human
  - id: semi-stage-gate
    row: "1"
    column: semi
    mode: semi
    kind: stage-gate
    behaviour: auto
  - id: semi-phase-gate
    row: "2"
    column: semi
    mode: semi
    kind: phase-gate
    behaviour: human
  - id: semi-walking-skeleton
    row: "3"
    column: semi
    mode: semi
    kind: walking-skeleton
    behaviour: human
  - id: semi-question
    row: "5"
    column: semi
    mode: semi
    kind: question
    behaviour: auto
  - id: full-phase-gate
    row: "2"
    column: full-interactive
    mode: full
    kind: phase-gate
    behaviour: auto
  - id: full-walking-skeleton
    row: "3"
    column: full-non-interactive
    mode: full
    kind: walking-skeleton
    behaviour: auto
  - id: none-swarm-batch-end
    row: "16"
    column: none
    mode: none
    kind: swarm-batch-end
    behaviour: human
  - id: semi-swarm-batch-end
    row: "16"
    column: semi
    mode: semi
    kind: swarm-batch-end
    behaviour: auto
```

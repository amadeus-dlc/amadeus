# 申し送り — pr-convergence 直前での park(2026-08-19)

本 intent は `pr-convergence` の直前で park した。ここまでの到達点と、再開時に必要な手順を記す。

## 到達点

- Issue **#2764** は **CLOSED**(`closedAt` 2026-08-19T08:43:22Z)。completion の mirror 境界が `operation: sync` / `operation: close` の両方 completed で settle 済み
- Goal reconciliation 完了(`receipt-712f23c4b61c2678d87a34f54f84e46e`、`goal-statement` = ACHIEVED)
- 完了ステージ: reverse-engineering / requirements-analysis / code-generation / build-and-test / tla-authoring(いずれも `[x]`)
- 未完了: `pr-convergence`(`[-]`、Current Stage)/ `formal-model-check`(`[ ]`、最終 in-scope ステージ)

## 再開時に必要な手順

1. **PR #3236 の着地** — merge queue 投入済み(head `e5daba1d1`、mergeStateStatus CLEAN)。収束と queue 投入は監督者が実施
2. **未 push コミットの本線配送** — `dd31d44be`(tla-authoring / formal-model-check の stage record)と `ded8da4ba`(順序訂正の記録)がローカルにのみ存在する。#3236 が queue 投入済みで GH006(`Branches that are queued for merging cannot be updated`)により push 不可のため、着地後に後続 PR で流す(`cid:code-generation:queue-immutable-record-canonical`)
3. **pr-convergence ステージの完了**
4. **formal-model-check のゲート再開放と承認** — 成果物(`construction/formal-model-check/model-check-verdict.md`)は作成済み。マイルストーンゲートなので organic な `gate-start` と、その後の実 HUMAN_TURN が1回要る
5. **stale な completion 準備の張り替え** — 下記

## 未解決のブロッカー: stale な Workflow Completion 準備

`amadeus-state.md` の Runtime State に以下が残っている:

```
- **Workflow Completion Instance**: terminal:build-and-test
- **Workflow Completion Stage**: build-and-test
- **Workflow Completion Status**: pending
```

これは build-and-test が最終ステージだった時点(recompose 前)の準備である。recompose で `pr-convergence` と `formal-model-check` が加わり build-and-test は最終ではなくなったため、以下**3つの経路すべて**を塞いでいる:

| 経路 | 拒否文言(逐語) |
|---|---|
| `amadeus-orchestrate next` | `Goal reconciliation refused completion mirror: Workflow completion target build-and-test is not the final in-scope stage` |
| 最終ステージの `approve` | `Workflow completion is already prepared for build-and-test at terminal:build-and-test` |
| park の mirror 境界 | `lifecycle snapshot pending completion stage build-and-test does not match Current Stage pr-convergence` |

`prepareWorkflowCompletion`(`packages/framework/core/tools/amadeus-workflow-completion.ts:88-100`)は別 stage の準備が残っていると throw するため、`terminal:formal-model-check` での準備し直しには先に上記3フィールドの解消が要る。CLI に消去 verb は見つかっていない。方針(フィールド消去の verb を足す / 準備の張り替えを許す / recompose 時に自動で無効化する)は Issue **#3249** の是正に含めるのが素直。

## park の mirror 境界が未同期

上記により park の mirror sync が失敗した(`WORKFLOW_PARKED` 自体は emit 済みで `Parked: 2026-08-19T09:27:35Z` / `Parked At Stage: pr-convergence` は state に記録されている)。ワークフローは継続可能な状態で、未同期は本節が可視の記録である。GitHub 側の Issue #2764 は既に CLOSED なので、この未同期による見え方の不整合はない。

## 本 intent 由来の起票

- **#3239** — supersede された unit に正直なクロージャ経路がない
- **#3243** — active-intent カーソル下で `t-approve-batch-presence-guard` が決定的に落ちる
- **#3249** — パーク済み intent が終端不能(complete-workflow と jump が別情報源を読む)
- **#3250** — applicability 判定が bare ID の文字列一致で別文書の同名 FR-N と衝突する

いずれもクロスレビュー未実施(本文に明記済み)。

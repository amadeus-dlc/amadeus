# Code Summary — unit interactive-carveout(U4 / ADR-5 / FR-4 / Q11=A)

## Commits(worktree `bolt-interactive-carveout`、base `swarm-int-rfc0001@b69be09db`)

| sha | subject |
|---|---|
| `cfabed9bd` | test(stop-hook): pin the interactive carve-out decision (ADR-5 / FR-4) |
| `6b4864e6c` | feat(stop-hook): decide the question and compose carve-outs on interactivity |
| `02c232762` | test(stop-hook): retarget the mode-guard pins at the new carve-out axes |
| `d5213d59d` | test(stop-hook): bring the end-to-end cases up to the RFC-0001 terminals |
| `d32546f8e` | docs(stop-hook): describe the carve-outs the way they now decide |

## 実装 summary

- `packages/framework/core/hooks/amadeus-stop.ts`: 質問(carveout 2, :448-463)・compose(carveout 3, :481-514)の mode/grant 根拠拒否を撤去し、(a) C3 の `resolveSessionInteractivity` による対話性判定、(b) `readProductionWaitingStop` 経由の ruling-order terminal(contested/none)判定、の2軸へ置換。両失敗方向(判定不能・terminal 不読)は carveout を閉じる方向(block維持)へ倒す。allow 記録に発火した carveout 種別と対話性根拠(`source`)を追加(R-15)。human-wait(carveout 1)・conversational(carveout 4)は無変更。
- `tests/integration/t561-interactive-carveout.integration.test.ts`(新規、350行): FP-1〜FP-5 の5ケース + R-11/R-12無退行pin。
- `tests/integration/t456-question-carveout-predicate.test.ts`(200行、削除): 主題である `isQuestionCarveoutIntent` predicate 自体が撤去されたため。
- `tests/integration/t121-stop-hook-enforce.test.ts` / `t195-stop-hook-compose-carveout.test.ts` / `t246-routing-and-autonomy-guards.test.ts` / `...canonical-state-write...`: 新しい carveout 軸へ retarget。
- `tests/e2e/t122-stop-hook-e2e.test.ts`: park のケースを「park は成功する」(U3 の D1/D5 撤去に整合)へ更新。

## 検証(実測)

Red 測定コマンド: `bun test tests/integration/t561-interactive-carveout.integration.test.ts`(base `b69be09db` + テストファイルのみ)、exit 1、"9 pass / 5 fail / 42 expect() calls / Ran 14 tests across 1 file"。全 verbatim ログ保存先: `/private/tmp/claude-501/-Users-j5ik2o-orca-workspaces-amadeus-bugfix-0815-0/9076746d-a35e-479f-92f4-a37137440343/scratchpad/t561-red.txt`。

実装後: 14 pass / 0 fail。

## Red 逐語

5つの Red、FDの falling-proof 表に対応:

- FP-1(R-4/R-5 question): 「full + active grant + a recorded non-unique terminal returns the turn」— Expected: true / Received: false(原因: `amadeus-stop.ts:450` のmode拒否)。
- FP-2(R-4 compose): 「full + active grant + a fresh compose marker returns the turn」— Expected: true / Received: false(原因: `:485`)。
- FP-3(R-8 question): 「no HUMAN_TURN: an unanswered tag does NOT release the stop」— Expected: false / Received: true。
- FP-3(R-8 compose): 「no HUMAN_TURN: a fresh compose marker does NOT release the stop」— Expected: false / Received: true。
- FP-5(R-2): 「a throwing interactivity port keeps the compose carve-out shut」— Expected: false / Received: true。

FP-4(R-6、「a unique terminal does not fire the carve-out」)は改修前後とも Green(設計どおり — R-4を除去してR-5の束縛を入れない実装ではこの検査が赤くなる)。

## 申し送り

- 統合ギャップ(本 unit では実装しない、報告のみ): `WaitingCause.interactivityBasis.interactive` は `amadeus-waiting.ts:34` で literal `false` 固定であり、`enterProductionWaiting` は非対話ランのrulingしか記録できない。**対話セッションでの escalate terminal を永続化するwriterが現時点で存在しない**。結果: carveout 2の semi/full 対話armはinert(mode none/unset armはR-7経由でlive)。hook側は実装完了しており、エンベロープが存在すれば即座に発火する。この gap は U1/U3 の consumer 側の欠落であり、interactive-carveout の owned files 内では埋められない。
- 逸脱: none(FD-input resolution として `readProductionWaitingStop` を選定した経緯は「seam 解決」節参照 — 設計逸脱ではなくFDが明示的に開いた自由度の範囲内)。

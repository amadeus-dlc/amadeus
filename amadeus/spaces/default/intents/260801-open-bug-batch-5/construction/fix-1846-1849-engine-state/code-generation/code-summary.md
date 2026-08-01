# Code Summary — fix-1846-1849-engine-state(Bolt 2)

上流入力(consumes 全数): requirements.md

- 実装は `requirements.md` FR-3 / FR-4 の AC 全数に対し Red→Green を実測して完了した(下表)。PR: [#1873](https://github.com/amadeus-dlc/amadeus/pull/1873)(branch `bolt/obb5-2-engine-state`、base `c49e385ac`)。

## 変更面

- `packages/framework/core/tools/amadeus-utility.ts` — birth scaffold へ `- **Construction Autonomy Mode**: unset` 追加(FR-3)、compose 配線 `recompile → generateRunners → resyncIntentStates`(FR-4)、recompose --add の行不在 loud 拒否(AC-4c)。
- `packages/framework/core/tools/amadeus-lib.ts` — 共有 writer 抽出(`renderStageProgressSection` / `replaceStageProgressSection` / `perUnitLineOf` / `rebuildDerivedPlanFields`)+`resyncStateToStageGraph` 新設(outcome: `resynced|current|not-running|foreign-rows|unreadable`)。
- dist 7面+self-install 再生成(`bun scripts/package.ts` + `bun run promote:self`)。
- テスト: t393 / t394 新設(予約使用・返上なし)、t33 pin 明示改訂、coverage registry 再生成(function 154→155)。

## AC 実測(Red verbatim → Green)

| AC | Red | Green |
|---|---|---|
| AC-3a | `Field not found in state file: "Construction Autonomy Mode"`(exit 1) | set-autonomy exit 0、state に反映 |
| AC-3b | — | t33 pin 明示改訂(共有 fixture 据置) |
| AC-3c | drift 照合が `["Construction Autonomy Mode"]` を検出 | green(陳腐化2件は明示 allowlist) |
| AC-4a | `Stage "user-stories" is not present in the state file`(verbatim) | re-sync 後に非再現、checkbox 行復元 |
| AC-4b | counters 未再計算 | Total/Completed/Stages to Execute が countCheckboxes 実測と整合 |
| AC-4c | recompose --add が exit 0 無言 no-op | exit 1 + `no row in the state file`、state バイト不変 |

## 検証(実測 exit code)

typecheck 0 / lint 0 / dist:check 0 / promote:self:check 0 / complexity-gate 0 / 対象テスト(t393/t394/t33/t194)61 pass 0 fail。複雑度 NEW_VIOLATION は helper 抽出で解消(baseline 無改変)。

## 同根棚卸し(same-root)

`setCheckbox` / `setStageSuffix` の行不在無言 no-op のうち本 PR で閉じたのは recompose --add と compose 後 re-sync の2経路。残存(amadeus-state.ts advance 系ほか、report 記載の全列挙)は [#1874](https://github.com/amadeus-dlc/amadeus/issues/1874)、`Completed` の定義差(advance = 生カウント / 再構築系 = EXECUTE 実効限定)は [#1875](https://github.com/amadeus-dlc/amadeus/issues/1875) として Issue 化済み(CR-6 充足)。PR 本文にも反映済み。

## 逸脱

なし。scope 内の判断3件(テンプレ陳腐化2件の allowlist ピン、共有 fixture 据置、複雑度の helper 抽出)は plan・PR 本文に記録。

## 残タスク(conductor 側)

- FR-4r: `260729-otel-upstream/amadeus-state.md` の skew 修復(本修正の `resyncStateToStageGraph` を PR 着地後に適用)。
- PR #1873 の CI green 確認とマージ承認伺い。

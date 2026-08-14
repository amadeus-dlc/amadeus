# Code Summary — ambient-error-sink(Issue #3004)

## 変更ファイル

- `packages/framework/core/tools/amadeus-orchestrate.ts`(+47 / −10、`git diff --stat` 転記)
- 新規 `tests/integration/t544-ambient-projectdir-refusal.integration.test.ts`(187 行。採番は既存最大 t543 の次で衝突なしを実測)

## 実装内容(FR 対応、Q1=A / Q2=A 裁定どおり・逸脱なし)

- **FR-1**: `main()` の4 dispatch(next / report / resolve-failure / park)を `resolveProjectDir(projectDir)` の式置換に変更。解決は冪等(explicit はそのまま返る)ため CLI 契約はバイト不変。
- **FR-2**: 新規ヘルパ `refuseAmbientProjectDir`(非 export、CCN 2)が `projectDir === undefined` を検出し `emitStateNeutralError`(recordError=false)で拒否 — ambient には一切触れない。`handleNext` は既存様式どおり `refuseBlockedNextEnvironment` の先頭へ畳み込み(本体 CCN 22 のまま不増)、`handleReport` / `handleFailureRuling` は冒頭1行。拒否文言(英語・新規)のテスト固定句は `must not rely on ambient workspace resolution`。
- **FR-3**: `handlePark` のシグネチャを `projectDir: string` へ狭め(非 export・main 専用)、ランタイムガードなし(理由コメント付き)。
- **FR-4/FR-5**: t544 が env 段(A: handleReport / B: handleNext / C: handleFailureRuling)と marker 段(D: t481 idiom の chdir save/restore)の undefined 形を固定。各ケースは拒否 directive と ambient fixture の監査シャード**空**の両面を assert(F2 仮説が残っていても偽緑にならない t258 T1 形)。

## TDD / 落ちる実証(実測、scratch: `<session-scratchpad>/cg2/`)

- 未修正 core に対する t544 実行: **0 pass / 4 fail**(exit 1)。全ケースが患部そのものの形で赤 — verbatim: `expect(auditShardsOf(ambient)).toEqual([])` に対し `+ [ "j5ik2o-mac-studio-lan-fixturecloneid01.jsonl" ]`(ambient への shard 追記を実測)→ 実装後 **4 pass / 0 fail**。
- 初回ドラフトの Test B は stage-graph ENOENT で汚染を示せない赤だったため、t211 と同じ `AMADEUS_STAGE_GRAPH` シームで是正してから赤を揃えた(builder 報告に記録)。

## 検証(実測 exit code / 転記)

| 検証 | 結果 |
|---|---|
| `bun run build` | exit 0、追跡ファイルへの dist 起因変更なし |
| t544 | 4 pass / 0 fail(builder + conductor 独立再実測) |
| t214(#839 契約、dist import) | 5 pass / 0 fail |
| t258(#1389 契約) | 4 pass / 0 fail |
| 周辺群 t213/t211/t198/t114/t528/t481/t55/t118/t248 ほか | すべて 0 fail(builder 報告の表) |
| `bun run typecheck` / `bun run lint` / `bun run source-only:check` | exit 0 |
| complexity gate | 35 pass。CCN 実測: handleNext 22(baseline 22 不増)、refuseAmbientProjectDir 2、refuseBlockedNextEnvironment 3。閾値超過集合は baseline と同一 |
| 実 record 監査純度 | 本 intent audit shard md5 前後不変(builder: `006f9e3b…`、conductor 再実測: `10e42e27…` 前後一致 — 値の差はその間の正規の workflow 監査行由来) |

## 環境起因の赤(自変更由来でないことを切り分け済み)

- t265: 単独実行はランナー注入 env(`AMADEUS_SKIP_HUMAN_PRESENCE_GUARD` 等)を欠くための赤。env 付与で 63 pass / 0 fail。
- t143: SDK レート制限(`You've hit your weekly limit`)による LLM テストの赤。コード非依存。フルスイート結果で最終確認する。

## 計画からの逸脱

なし(Step 1 の Test B 初回ドラフト是正は計画内の red 調整)。

## 残課題

- フルスイート1回通し(conductor、build-and-test ステージで実施)。
- PR 発行前の deslop と再検証(pr-convergence 前)。

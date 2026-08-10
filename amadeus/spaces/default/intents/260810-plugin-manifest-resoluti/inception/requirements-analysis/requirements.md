# Requirements — 260810-plugin-manifest-resoluti

Intent: `260810-plugin-manifest-resoluti` / Scope: `self-fix` / Depth: Minimal / 観測 ref: `7b9391be2db4fad791d637293ea442d5a1462bac`
対象: [Issue #2823](https://github.com/amadeus-dlc/amadeus/issues/2823)(ミラー [#2829](https://github.com/amadeus-dlc/amadeus/issues/2829)) — plugin manifest の所在と evaluator argv が consumer ワークスペースで解決しない

上流入力(consumes 全数): `codekb/amadeus/business-overview.md` / `codekb/amadeus/architecture.md` / `codekb/amadeus/code-structure.md`、および RE scan 記録 `codekb/amadeus/re-scans/260810-plugin-manifest-resoluti.md`(全知見の一次参照)

## Intent 分析

consumer ワークスペース(repo-root に `plugins/` を持たない)で plugin の宣言 advisory 機構が構造的に機能しない欠陥を修正する。目的は「advisory による保護が効いていると信じているのに効いていない」偽 green の解消であり、#2790 で固定された配送設計(拡張子限定 transform・plugin.json は composed 面へ配らない)を維持したまま、読取規約を配送規約へ整合させる。

## 機能要件

### FR-1: manifest 解決の多面化

`pluginManifestPath`(`amadeus-advisory-declaration.ts:295-297`)の単一面前提を改め、authoring 面 `<projectRoot>/plugins/<name>/plugin.json` を第1候補、staging 面 `<harnessDir>/.amadeus-plugin-src/<name>/plugin.json` を第2候補として順に探索し、最初に実在するものを採用する。受入: staging にのみ manifest を持つ consumer 形 fixture で宣言 advisory が供給されること。

### FR-2: evaluator argv の plugin-root-relative 解決規約

manifest 内 argv の相対パスは「採用された manifest の plugin ルート」からの相対として解決する(`spawnEvaluator` の cwd = projectRoot は維持し、相対 argv 要素を plugin ルートへ join する)。受入: dogfood 面(authoring)と consumer 面(staging)の双方で evaluator script が解決すること。

### FR-3: 既存 argv の規約適合

`plugins/formal-model-check/plugin.json:61` を `tools/tla-authoring.ts` へ修正し、engine 直書きの `amadeus-advisory-choice.ts:925`(`formalCheckRoute`)も同一規約(解決済み plugin ルート基準)へ揃える。受入: 両経路で実ファイルへ解決することを示すテストが緑。

### FR-4: manifest 不在の loud 化

FR-1 の全候補で manifest が見つからない場合、無音 `return []` / `return null` をやめ、診断(監査イベントまたは stderr 警告)を発行する。fail-open セマンティクス(advisory を発火させない・ワークフローを停止させない)は維持する。受入: 不在時に診断が記録され、かつ挙動が非停止であることのテスト。既存 pin t445:155-160 は「無音であること」でなく「advisory 非発火」を本質として書き直す。

### FR-5: declarationFor 系の同一規約適用

`declarationFor`(`:386-400`)・`declaredFormalCheckArgv`(`:403-410`)・`declaredHandoffStage`(`:413-419`)も FR-1/FR-2 の解決規約に乗せ、consumer で `handoff_stage` が directive から黙って欠落する退化(`amadeus-advisory-choice.ts:740`)を解消する。受入: staging 配置で `declaredHandoffStage` が `tla-authoring` を返すテスト。

### FR-6: ドリフトガード述語の追加

`plugins/**/plugin.json` 内の repo-root-relative argv(`"plugins/` 始まりの文字列要素)を検出する新規ガードテストを追加する(Issue 完了条件3)。受入: FR-3 適合後の現行ソースで緑、意図的な root-relative argv 挿入で赤になること。

### FR-7: consumer-layout 回帰テスト

dogfood layout に依存しないテストを追加する: (a) staging のみに plugin を持つ consumer 形 fixture での advisory 供給(t445 系に追加)、(b) dot-dir hostRoot で persistentInstall=true 腕を通す install 経路(t353 系に追加)。受入: 修正前コードでは赤(failing-first)、修正後に緑。

### FR-8: consumer 形ワークスペースでの経路実測(Issue 完了条件1)

repo 外の scratch consumer ワークスペースで folder-drop 腕・install verb 腕のそれぞれについて compose → 宣言 checkpoint 到達を実測し、(a) advisory 発火/診断出力、(b) hold 時の defer-with-risk 解除可否を exit code・出力で記録する。受入: 実測ログが build-and-test 成果物に残ること。

## 非機能要件

- NFR-1 後方互換: dogfood リポジトリ(本 repo)の既存挙動を変えない。既存 advisory テスト群(t444/t445/t526/t528/t529)は FR-4 の pin 書き直しを除き無修正で緑を維持
- NFR-2 決定性: compose の digest 比較(`amadeus-plugin-compose.ts:921-972`)の対称性を壊さない — 読取側変更のみで配送・digest 経路には触れない
- NFR-3 最小侵入: `{{HARNESS_DIR}}` transform の拡張子限定(`harness-transform.ts:27-29`、`amadeus-plugin.ts:671`)には触れない(#2790 設計固定)

## 制約

- #2790 要件(`260810-plugin-harness-dir-token/.../requirements.md:84/:86`)の設計固定を変更しない
- Issue クローズ・ラベル変更・他 Issue(#2267)の操作は行わない(ユーザー決定事項)
- 実測(FR-8)は repo 外 scratch で行い、dogfood tree を汚染しない

## 前提

- クロスレビュー2名成立済み(run `xrev-2823-20260810T094918Z`、ESTABLISHED_WITH_REFINEMENTS、target SHA `c51afbd0a99b2eb3f0b9c1ee4e2cef2772378131`)。review..observed の実 diff は被引用パスと交わらず、引用は observed で有効(RE scan 実測)
- 「解除経路のない hold」は過大で、人間の defer-with-risk は escape hatch として残存する(両レビュア一致)

## Out of scope

- #2267 の統合/close 裁定(着地時にユーザーへ提案。Q4-A)
- `{{HARNESS_DIR}}` トークンの `.json` 拡張(Q3-B 却下)
- marketplace/native-manifest 経路の staging 供給機序の調査(RE scan UNMEASURED、別 Issue 候補)
- pr-convergence plugin への advisory 宣言追加

## Open questions

- marketplace 経路で staging がどう populate されるかは repo 内に証拠がない(`CLAUDE_PLUGIN_ROOT` 参照 0 件)。FR-1 の staging 候補探索はその経路でも機能するが、供給そのものの欠損は別問題として残る

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-10T11:08:34Z
- **Iteration:** 1
- **Scope decision:** none

Minimal-depth contract satisfied: 8 FRs with stable ids, 7/7 sections, all answers filled, traceability to consumes; no BLOCKERs

### Findings

- FOLLOW-UP | requirements.md:FR-2 | argv path-like vs flag distinction rule should be one line
- NIT | requirements.md:FR-4 | diagnostic channel should be fixed to one at design
- NIT | requirements.md:FR-8 | handoff of measurement log to build-and-test should be explicit

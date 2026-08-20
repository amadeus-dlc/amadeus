# Issue Evidence — 260820-fmc-drift-batch

## メタデータ

- fetched-at: 2026-08-20T07:17:21Z / repo: amadeus-dlc/amadeus / tool: issue-evidence fetch

## Issue #3186: enhancement(formal-model-check): tla-authoring 適用性判定に語彙 drift 検出と欠陥再発トリガの腕がなく、モデルが実装から無音で乖離する(PrConvergenceGate に landed 不在の実証付き)

- state: OPEN / labels: 未取得(本 verb の read 面は本文・状態・コメントのみ) / url: https://github.com/amadeus-dlc/amadeus/issues/3186 / target-sha: 127be70c5d7a584016f88a5d44e8715904020721
- review-run-id: xrev-3186-215855ea7-20260818T070859Z / 独立レビュアー: 2名(marker 計数)

### 本文(verbatim)

> **改訂 2026-08-18**: クロスレビュー収束判定 **REFRAME_REQUIRED**([reviewer-1](https://github.com/amadeus-dlc/amadeus/issues/3186#issuecomment-5325181446) / [reviewer-2](https://github.com/amadeus-dlc/amadeus/issues/3186#issuecomment-5325181696)、両名 CONFIRMED_WITH_REFINEMENTS)を受けて本文を改訂。欠落の実在(語彙 drift 検出の腕・欠陥再発トリガの不在)は両名が機械的に実証済み。改訂点: 機序の因果修正(事実 1〜3・5)、期待結果 2 の書き直し(反証された C3c への依存を除去)、関連 Issue への #2929/#3187/#1921/#1510 追加。検証断面 = origin/main `127be70c5`。

### 重複・現行状態の確認

- [x] open/closed の両方を対象に、同じ課題・提案・質問の Issue を検索しました（`gh issue list --state all --search "<q>"` を `applicability` / `revise-model` / `tla-authoring` / `語彙 drift` / `authoring-hold` の 5 述語で実行。判定基準の設計欠落を扱う Issue は不在。最近接: #2289〈revise-model の replace-by-name 登録機構 — 本提案採用時の前提部品であり別論点〉、#2766〈CLOSED — 適用判定の供給経路。本 Issue は判定が動いた上での基準設計を扱う〉。**訂正(改訂時)**: 上記 5 述語は #2929〈OPEN・IMPLEMENTATION_PATHS の plugin tools 境界拡張〉を表面化できなかった — クロスレビューで両名が独立に検出。期待結果 2 と正面重複するため関連 Issue へ追加した）
- [x] origin/main と関連する open/merged PR を確認し、現行状態でも起票が必要だと確認しました（観測 ref = origin/main `23d4ae767`、改訂時再確認 `127be70c5`。`amadeus/spaces/default/specs/tla/PrConvergenceGate.tla:14` は現行 head でも逐語 `Verdicts == {"none", "created", "converged", "override"}` — `landed` 不在のまま）

### エレベーターピッチ

[実装プロトコルとTLA+モデルの意味的乖離を判定段で検出し、モデルの防御力低下を止め] たい
[tla-authoring の適用性判定を運用する conductor と、形式検証の実効性に依存するチーム] 向けの、
[適用性判定の drift 検出・再発トリガ拡張] というプロダクトは、
[判定契約に「モデル語彙と実装の意味的整合検査」と「欠陥再発による authoring 評価の強制起動」の 2 本の腕を追加する契約改定] です。
これは [語彙 drift を impl-only の根拠に転用する現行の逆方向判定を止め、drift 発生時に revise-model の明示裁定を強制] ができ、
[現行の SOURCE_DRIFT 検査(実装バイトのハッシュ再ピンのみ)] とは違って、
[モデルが緑のまま実装から意味的に乖離していくことを検出できる] のが備わっている。

### 背景・対象範囲

tla-authoring の適用性判定は、独立 2 名のブラインド再調査(run tla-reinvest-20260818)で**機構としては健全**と確定した(260811 以降 25/25 起動・完走、判定記録 25/25、スポットチェック 5 件全て一次資料から再実測一致)。しかしその判定基準の**設計**に、authoring を構造的に過少選択する欠落があることが実測で確定した。個々の判定は既存ノルム(two-layer-verification-posture「並行プロトコルの spec 変更時のみ」)に忠実かつ実測付きで誠実であり、本 Issue は過去判定の非難ではなく**基準契約の追加**を提案する。

なお契約は分類クラス `semantic-change`(`plugins/formal-model-check/stages/tla-authoring.md:51`)と revise-model の強制規則(同 :55-56「a registered set whose reachable behaviour changed must route to `revise-model`」)を**既に持つ**。欠けているのは drift をこの分類へ届ける**検出述語**であり、本提案は新しい分類機構の発明ではない(クロスレビュー両名の一致所見)。

対象範囲: `plugins/formal-model-check/stages/tla-authoring.md` の適用性判定契約(Step 1)、判定成果物の様式、および関連ノルムとの整合の明文化。

### 根拠・実測証拠

**測定 provenance**: 独立 2 名のブラインド調査(A=配線・発火完全性、B=産出・記録品質。共通コア設問 7 問で突き合わせ、数値不一致 1 件〈起動 25 vs 24〉は origin/main 一次証拠で 25 に裁定 — B のローカル 50 コミット遅れ由来)+ conductor の独立測定。観測 ref = origin/main `23d4ae767`(構造)、audit 実測は各調査の報告に述語・exit code 併記。改訂時の追加実測はクロスレビュー(凍結 SHA `127be70c5`)による。

**事実 1 — 語彙 drift の実在(生得的)**: 実装の landed verdict の初出は PR #2414(2026-08-07)であり、PrConvergenceGate モデルの作成(PR #2932、2026-08-12、intent 260811-pr-convergence-gate)より**前** — drift は蓄積したのではなく**モデル誕生時から存在する**(旧版の「(PR #3081 → #3113 → #3172)」は merged-arm 最終化の系譜であって landed の初出ではない — クロスレビュー訂正)。現行実装の終端 verdict 集合 {converged, override, landed} はモデルの `TerminalVerdicts == {"converged", "override"}` を超えており、不変量 WorkflowGuarded は**現行実装に対し事実として偽**。`PrConvergenceGate.tla:14` の `Verdicts` は 4 値のままで `landed` を持たない。

**事実 2 — drift が「不適用の根拠」に転用されている**: intent 260816-priority-bug-batch-3 の**単一の判定記録**(memory.md:5)が逐語「PrConvergenceGate の Verdicts/遷移は無改変(transitionAllowed 不変・**landed 状態なし**)」を impl-only の根拠として引き、同じ記録内に第三の同型節(BoltPrAttestationGate の `humanQuestion` BOOLEAN 抽象)も未計上のまま存在する(クロスレビュー精密化 — 旧版はこれを複数記録の別例のように読める書き方をしていた)。別記録では、選挙 TOCTOU 修正(#3046 → PR #3171)の判定が「FormalElection は arrivalSequence を語彙に持たず(grep 0 hit)」を impl-only の根拠にした(調査 B が独立再実測: `git grep -F 'arrivalSequence'` 0 行 exit 1、陽性対照 `accepted` 18 hit exit 0 — 判定の実測自体は正確)。**モデルが表現できないことが、拡張のトリガではなく対象外の根拠になっている。** なお FormalElection はピン被覆が十分でも同型の drift を起こしており、この欠落はピン被覆問題(事実 3)へ還元できない。

**事実 3 — ピン集合の被覆不足(機序を改訂)**: model-map の実装ピンは PrConvergenceGate / BoltPrAttestationGate とも `packages/framework/core/tools/amadeus-orchestrate.ts` + `amadeus-state.ts` の 2 件のみ(model-map.json 実読)だが、この 2 件制限は**判定者の緩さではなく model-map の IMPLEMENTATION_PATHS による validator 強制**である(旧版は因果を逆に記述していた — クロスレビュー訂正)。収束プロトコルの状態機械の実体は `plugins/github-pr-convergence/tools/` 側にあり、260815-stale-epoch-landed の判定は「変更 8 ファイルがピン外」を impl-only の根拠にした(調査 B の再実測で数値は正確)。**旧版の「stage 自身の分類法ではピン外変更は non-target が正しい」は反証済み(CONTRADICTED)**: 判定器は宣言 kind × 登録モデルとの subject 交差の 2 値だけを読み(`plugins/formal-model-check/tools/tla-applicability.ts:129-131` — rationale は一切消費されない)、登録モデルに交差する subject へ `non-target` を宣言すると J2d undecidable で停止する(:91-96 `"non-target:true": "J2d"`。reviewer-1 が判定器の repo 外実行で反証実験済み)。終端 route は {impl-only, non-target}(:169)。**帰結**: ピン外で起きるプロトコル進化は、分類の緩さではなく交差判定の母集合(ピン集合)が実装面を覆っていないことにより、構造的に authoring 不要へ分類され、モデルへ還流しない。

**事実 4 — 過少選択の定量面**: 終端 route が author-new なのは全実行中ちょうど 1 件(260811-pr-convergence-gate。2 名が逐語読みで独立に一致。起票 ref で 25 実行、凍結 ref `127be70c5` で 26 実行 — 追加 1 件も author-new ではない)。8/14 以降は authoring 判定ゼロで、specs/tla への 8/14 以降 17 コミット中 15 は実装ハッシュ再ピンのみ(モデル改訂 0)。SOURCE_DRIFT 検査はバイト再ピンの構文検査であり、意味的 drift(事実 1)を検出しない。

**事実 5 — 実害クラスタと検査面の限界**: モデル未追随の landed / report-epoch レーンで状態機械バグが短期に連発した — #3062、#3110、#3149(+誤作成 PR #3109 事故)。いずれも impl-only で修正され、モデルは一度も追随していない。対照として、隣接の attestation 面では #2985 への対応で BoltPrAttestationGate のモデルが追加された(PR #2999、8/14)— ただしその registration receipt の route は `revise-model` であり author-new ではない(クロスレビュー訂正。事実 4 の「author-new 1 件」と整合)。また `PrConvergenceGate.cfg` は INVARIANT のみで PROPERTY(liveness/到達可能性)を持たないため、**語彙へ landed を足すだけでは上記 3 件の欠陥クラス(到達可能性)を捕捉できない** — 腕 1 の最初の適用裁定(期待結果 1)は語彙追加に閉じない設計裁定として扱う必要がある(reviewer-1 所見)。

**観測(構造背景)**: tla-authoring は `requires_stage: [build-and-test]` で実装後に位置し、実運用ではモデル作成が code-generation unit 側で起きる(FormalElectionCore は 260813-election-multiq の U7 成果物、PR #3036)ケースや、intent record 外で着地する(BoltPrAttestationGate、PR #2999 — record dir 0 ファイル)ケースがある。基準改定はこの「事後追認ゲート」としての実態を前提に設計する必要がある。

**仮説(明示)**: 提案の 2 本の腕を追加すればモデル乖離の進行が止まり、landed レーン級の再発クラスタが形式検証の射程に入る — 効果量は未実測であり、完了条件の適用実績で確認する。

### 期待結果・完了条件

実装形は設計裁定事項とし、本 Issue は腕の存在と裁定の強制のみを固定する:

1. **語彙 drift 検査の腕(検出述語の追加)**: 適用性判定契約に「変更が接触する登録モデルについて、実装の状態・遷移・verdict 語彙とモデル語彙の意味的整合を検査する」手順を追加し、drift 検出時は impl-only / non-target へ自動分類せず、既存の `semantic-change` 分類と revise-model 強制規則(tla-authoring.md:51, :55-56)へ届けて **revise-model 候補として明示裁定**(採用または根拠付き不採の記録)を強制する。第三者確認: 判定成果物様式に drift 検査欄が存在し、PrConvergenceGate × landed が最初の適用例として裁定される(モデル改訂 or 根拠付き不採のいずれかが記録される)こと。この裁定では、cfg が PROPERTY を持たない事実(事実 5)を踏まえ、語彙追加だけで欠陥クラスを閉じたと見なさないこと
2. **ピン集合の被覆確認**: 判定手順に「ピン集合(model-map の IMPLEMENTATION_PATHS)が対象プロトコルの実装面を覆っているか」の確認を含め、覆っていない場合は (a) その事実と不足面を判定成果物へ明記し (b) ピン集合の拡張(#2929 が提案する plugin tools 境界への拡張を含む)を裁定対象として提示する。**non-target への再分類は行わない** — 登録モデルと交差する subject への `non-target` 宣言は判定器が J2d undecidable で拒否することが反証実験で確定している(事実 3)。なお被覆確認は腕 1 の代替にならない — FormalElection はピン被覆が十分でも同型の drift を起こした(事実 2)ため、#2929 単独では本 Issue を閉じない
3. **欠陥再発トリガの腕**: 同一プロトコル領域での状態機械バグ再発を author-new / revise-model 評価の強制起動条件とする(件数閾値・重大度条件は実装 intent で観測レンジ内に確定 — `cid:code-generation:c1-threshold-inside-observed-range` 準拠)
4. 新設する検査・ゲートは**落ちる実証**付きで完成扱いとする(team.md Mandated 準拠)
5. two-layer-verification-posture(「全変更への一律義務化はしない」)との整合を契約に明記する — 本提案は義務の全面拡大ではなく、drift・再発という**信号があるときに裁定を強制する**加算である

### 影響・価値

現状のままでは、モデルは formal-model-check が緑のまま実装から意味的に乖離し続け(検査はバイト再ピンのみ)、最も欠陥密度の高い並行プロトコル(landed / report-epoch レーン: 2 週間で 3 Issue + 事故 1 件)が形式検証の射程外に留まる。腕を追加すれば、乖離は判定段で可視化され、モデルの防御力が変更に追随する。導入しない場合、モデル資産(7 モジュール、TLC 完全探索 + falling proof 5 件付きの品質)の実効性が時間とともに無音で減価する。

### 関連 Issue・PR・intent

- #2929(OPEN・enhancement/P2)— **期待結果 2 と正面重複する隣接提案**(model-map IMPLEMENTATION_PATHS の plugin tools 境界への拡張)。本 Issue の被覆確認はこれを前提部品にできるが、FormalElection の同型 drift(事実 2)により #2929 単独では本 Issue を閉じない(クロスレビュー両名の独立検出 — 起票時の重複検索 5 述語では表面化しなかった)
- #3187(OPEN・question)— 旧版の別起票候補 (a) の実現: authoring-hold の space 宣言投入 or 退役の裁定(advisory 経路が `authoring-subjects.json` 不在により常時 no-hold である事実は本調査の実測)
- #1921(CLOSED・bug/S3)— 先行事例: identity ピン対象外モデルの無音 drift(MirrorLifecycleCore)
- #1510(CLOSED・enhancement)— 先行事例: impl-only 変更時の model-map ハッシュ更新経路の整備(現行 SOURCE_DRIFT 再ピン運用の由来)
- 別起票候補 (b): terminal-route receipt の契約乖離 — impl-only / non-target 判定 8 件以上に対し永続化 receipt 3 件(stage 契約 Step 1 の要求未充足 5 件以上)
- 別起票候補 (c): BoltPrAttestationGate(PR #2999)の record 外着地 — どの intent の authoring 実行に帰属するか record から追跡不能(registration-receipt はリポジトリ全体で 1 件のみ)
- #2289(OPEN)— revise-model の replace-by-name 登録機構(本提案採用時の前提部品)
- #2766(CLOSED)— 適用判定の供給経路修正(本 Issue は判定が動いた上での基準設計)
- #2161(CLOSED)— authoring 工程の導入元
- #3062 / #3110 / #3149 — landed レーン再発クラスタ(事実 5)
- PR #2414 — landed verdict の初出(2026-08-07)/ PR #2932 — PrConvergenceGate モデル作成(2026-08-12)/ PR #3081 → #3113 → #3172 — merged-arm 最終化の系譜
- intent 260815-rfc-autonomy-modes(Running)— 到達時に本基準の最初の実地テストケースになる見込み(BoltPrAttestationGate の `humanQuestion` BOOLEAN 抽象を waiting terminal / semi 投影が超えるか)
- 調査一次記録: run tla-reinvest-20260818(独立 2 名ブラインド + 共通コア設問。報告は本セッション記録)/ クロスレビュー: run xrev-3186-215855ea7-20260818T070859Z([reviewer-1](https://github.com/amadeus-dlc/amadeus/issues/3186#issuecomment-5325181446) / [reviewer-2](https://github.com/amadeus-dlc/amadeus/issues/3186#issuecomment-5325181696))

### 優先度（いつ対応するか）

P2 — 通常

### 代替案・非採用理由

- **ノルム(team.md)だけ改定し判定契約に腕を足さない**: 指令ループ外の規範は該当イベント時にタスク化しない限り実行されない(P5)ため、同じ過少選択が再発する。非採用
- **全変更で revise-model 検討を義務化**: two-layer-verification-posture「一律義務化はしない」と正面矛盾し、admission check で拒否されるクラス。非採用
- **#2929(ピン集合拡張)のみで代替**: 被覆不足(事実 3)は閉じるが、被覆が十分な FormalElection でも同型 drift が起きた(事実 2)ため、検出述語の腕なしでは乖離は残る。非採用(ただし期待結果 2 の前提部品として併用)
- **現状維持**: 各判定はノルム準拠で誠実だが、基準自体が drift を対象外の根拠に使う方向を向いている以上、モデルの意味的乖離は構造的に拡大し続ける。非採用


### クロスレビューコメント(verbatim、コメント URL 併記)

#### j5ik2o — 2026-08-18T07:46:27Z — https://github.com/amadeus-dlc/amadeus/issues/3186#issuecomment-5325181446

## クロスレビュー（1人目・reviewer-1）: CONFIRMED_WITH_REFINEMENTS

<!-- issue-cross-review
review-run-id: xrev-3186-215855ea7-20260818T070859Z
reviewer-id: reviewer-1
execution-subject-id: sha256:57e6d28d2f32414a
target-sha: 127be70c5d7a584016f88a5d44e8715904020721
-->

### 独立性と対象

起票者・コーディネータのいずれとも異なる独立実行コンテキストとして、本 Issue のコメントを読まずに調査しました（実測時点で `comments=0`）。リポジトリ・GitHub の状態は一切変更していません。全リポジトリ事実は凍結 SHA `127be70c5d7a584016f88a5d44e8715904020721`（origin/main、2026-08-18T04:54:04Z）に対する object database 読み取りで取得し、スクラッチ作業はリポジトリ外で行いました。起票時観測 ref `23d4ae767` は currentness 差分の測定にのみ併用しています。二次レンズは「再現・現行コード機序・反証」で、各 CORE 主張はまず反証を試みてから判定しています。

`23d4ae767..127be70c5` の 5 コミットは `amadeus/spaces/default/specs` / `plugins/formal-model-check` / `plugins/github-pr-convergence` を **1 ファイルも変更していません**（`git diff --name-only` 出力 0 行、全体では 99 ファイル変更）。本 Issue の前提を無効化する変更はありません。

### Claim ledger

| 主張 | 判定 | 独立エビデンス | CORE |
|---|---|---|---|
| C1 語彙 drift の実在 | CONFIRMED（由来を精緻化） | `amadeus/spaces/default/specs/tla/PrConvergenceGate.tla:14` 逐語 `Verdicts == {"none", "created", "converged", "override"}`、`:15` `TerminalVerdicts == {"converged", "override"}`。実装側は `plugins/github-pr-convergence/tools/pr-convergence-predicate.ts:262,281-289`、`pr-convergence-cli.ts:644`（`created → landed`）、`:787`（祖先証明）、`:816-847`（merged override） | ✅ |
| C1 追加所見 | 新規 | `plugins/github-pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts:470-475` は `kind: landed` を pr-convergence の最終化 kind として受理し、`:482-484` は `created` のみ拒否。実装の終端集合は {converged, override, landed}。モデルの `WorkflowGuarded`（`.tla:41-47`）は `verdict \in TerminalVerdicts` を完了の必要条件とするため、**モデルの安全性不変量は現行実装に対して事実として偽** | ✅ |
| C2 drift の不適用根拠への転用 | CONFIRMED（証拠を強化） | `amadeus/spaces/default/intents/260816-priority-bug-batch-3/construction/tla-authoring/memory.md:5` に逐語「PrConvergenceGate の Verdicts/遷移は無改変(transitionAllowed 不変・landed 状態なし)」。さらに**登録エビデンスストアの受領書** `amadeus/spaces/default/specs/tla-evidence/fb1029e47….json`（route `impl-only`、generatedAt 2026-08-17T07:06:49Z）の `reason` に同型の根拠が 3 件 | ✅ |
| C3a ピンは 2 件のみ | CONFIRMED | `amadeus/spaces/default/specs/tla/model-map.json:14-23` / `:180-189`。この 2 ファイル内の `landed` は無関係な散文コメントのみ（`amadeus-state.ts` 7 hit・`amadeus-orchestrate.ts` 2 hit を全件実読） | ✅ |
| C3b 260815 判定がピン外を根拠にした | CONFIRMED（逐語） | `…/260815-stale-epoch-landed/construction/tla-authoring/applicability-assessment.md:10`「本 intent の変更面…は**ピン外**」→ route `impl-only`、`:17`「8 files 変更のうち engine 側 0」 | ✅ |
| C3c 「ピン外変更は non-target が正しい」 | **CONTRADICTED** | 判定器の実行で反証（下記 再現 R2）。登録モデルと交差する subject に `non-target` を宣言すると J2d undecidable。ピンが 2 件に留まる真因は `plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts:237-240` の `IMPLEMENTATION_PATHS` が plugin パス登録を構造的に拒否すること | ✅ |
| C4 過少選択の定量面 | CONFIRMED（母集団と括弧を精緻化） | 観測 ref で tla-authoring record dir = 25、監査実測で `STAGE_STARTED`/`STAGE_AWAITING_APPROVAL`/`GATE_APPROVED`/`STAGE_COMPLETED` = 各 25。author date ≥ 2026-08-14 の specs/tla コミット = 17、うち model-map.json のみ = 15、`.tla`/`.cfg` 改訂 = 2。`registration-receipt` はリポジトリ全体で 1 件 | ✅ |
| C5 実害クラスタ | CONFIRMED（対照のラベルを訂正） | #3062 / #3110 / #3149 はいずれも `bug`・github-pr-convergence・CLOSED、#3109 は未マージ CLOSED。対応 PR #3081 / #3113 / #3172 は `amadeus/spaces/default/specs/` を 1 ファイルも触っていない（同一コマンド内の plugins 側は 4〜6 ファイルヒットの陽性対照あり） | ✅ |
| C6 構造背景 | CONFIRMED（1 点 INCONCLUSIVE） | `plugins/formal-model-check/stages/tla-authoring.md:15-16` に `requires_stage: [build-and-test]`。`FormalElectionCore.tla` は `7711246fd`（#3036）で作成され record 上は `construction/formal-election-multiq/code-generation/` に帰属（同 intent の tla-authoring 判定は `:3` 逐語「経路は **not-applicable**（終端）」）。「U7」という unit 番号は record から確認できず | — |
| C7 重複・現行状態 | **REFINED（重要）** | #2766 CLOSED / #2289 OPEN / #2161 CLOSED、`.tla:14` 逐語一致はいずれも確認。ただし **OPEN の #2929（enhancement/P2、2026-08-12）が期待結果 2 前半と正面から重なる**。申告された 5 述語では表に出ません。別起票候補 (a) は #3187 として起票済み | — |
| C8 分類・ラベル | CONFIRMED | `.github/workflows/issue-labels.yml:72-89` が本文から導く種別・優先度と実ラベル（enhancement / P2）が一致。bug でないため S ラベル不要 | — |
| C9 完了条件の検証可能性 | REFINED（2 に実質的欠陥） | 1・4・5 は検証可能かつノルム整合（4 は team.md:83、5 は team.md:89 と非矛盾）。3 は閾値を project.md:135 の cid 付きで実装 intent へ明示委譲。**2 前半は実装済み判定表に照らして誤り** | — |
| C10 advisory 経路は常時 no-hold | CONFIRMED | 解決先は `<specsRoot>/authoring-subjects.json`（`plugins/formal-model-check/tools/tla-authoring.ts:520-522`）で凍結 SHA に不在。`advisoryHold`（`:565-579`）は ENOENT のみ no-hold。発火は `amadeus/config.json:49-54` の scope-bindings が全担 | — |
| C11 本文様式適合 | CONFIRMED（軽微な指摘あり） | `.github/ISSUE_TEMPLATE/enhancement.yml` の必須 9 ブロック全て present、7 行ピッチ正書式維持、team.md:62 の必須 6 要素充足 | — |

### 再現・コード実読

**判定器の実行による再現（凍結 SHA のソースをリポジトリ外へ展開して実行、bun 1.3.13）**

```
git archive 127be70c5… plugins/formal-model-check/tools | tar -x -C <scratch>   ; exit=0

R1  A impl-only + 交差あり + drift 根拠        => {"ok":true,"value":"impl-only"}
    B non-target + 交差あり                    => {"ok":false,"error":{"kind":"undecidable","row":"J2","conflicts":["J2d"]}}
    C impl-only + 交差あり + でたらめな根拠文  => {"ok":true,"value":"impl-only"}
    D semantic-change + 交差あり               => {"ok":true,"value":"revise-model"}
                                                                        ; exit=0
R2  260815-stale-epoch-landed の 3 行をそのまま投入
    row1 impl-only  FR-1/FR-2/FR-3 => impl-only
    row2 non-target FR-4/FR-6      => J2d undecidable
    row3 non-target FR-5           => J2d undecidable         ; exit=0
```

C が示すとおり、`rationale` は判定表に一切消費されない自由文字列です（`tla-applicability.ts:121-138` の `judge` は宣言 `kind` と交差の 2 値のみを読み、`:192` の `buildReceipt` が文字列として連結するだけ）。**「モデル語彙と実装の意味的整合を見る腕が存在しない」ことは機械的に実証されます。**

**由来（pickaxe 実測、いずれも exit=0）**

```
git log --oneline -S'LandedFacts'              -- plugins/  → c66bc1e7d (#2414)  2026-08-07
git log --oneline -S'next === "landed"'        -- plugins/  → 6ff5352ba (#3081)
git log --oneline -S'verifyMergedEpochAncestry' -- plugins/ → 585a87d9a (#3172), 8ceeb2dc1 (#3113)
git log --diff-filter=A -- …/PrConvergenceGate.tla         → bf38a1849 (#2932)  2026-08-12
git log                 -- …/PrConvergenceGate.tla         → 上記 1 件のみ
```

**不在確認（陽性対照つき）**

```
git grep -n -F 'arrivalSequence' <SHA> -- amadeus/spaces/default/specs/tla   → 0 行 ; exit=1
陽性対照 git grep -c -F 'accepted' <SHA> -- amadeus/spaces/default/specs/tla → FormalElection.tla:18 ほか ; exit=0
git grep -n -F 'tla-reinvest' <SHA> -- .                                     → 0 行 ; exit=1
陽性対照 git grep -l -F 'tla-authoring' <SHA> -- . | wc -l                   → 322 ; exit=0
```

**監査シャードによる 25/25 の独立再導出**

```
git grep -F 'tla-authoring' <SHA> -- ':(glob)amadeus/spaces/default/intents/*/audit/*.jsonl'   → 2257 行 ; exit=0
  attributes.Stage == "tla-authoring" で集計
  STAGE_STARTED 25 / STAGE_AWAITING_APPROVAL 25 / GATE_APPROVED 25 / STAGE_COMPLETED 25（25 intent × 各 1）
```

### 機序・影響・ラベル

判定契約の「機械が見る半分」と「人が書く半分」の境界が本 Issue の中心です。

1. 判定表 J1..J6 は宣言 `kind` と「宣言 subject が登録 `traceSubjects` と交差するか」だけで route を決め、根拠文は読みません。意味的整合を見る腕は設計上どこにも存在しません（R1-C）。
2. 交差のキーは intent ローカルな stable id です。PrConvergenceGate の登録 subject は `["FR-2","FR-3","FR-4","FR-5"]` で、無関係な intent が FR-2..FR-5 を振っただけで交差します。260813-election-multiq の判定記録 `:14` は逐語「model-map の trace 交差が空のため judge は author-new に倒れ、既登録モデルを二重に書き始める」と述べ、判定器の誤発火を避けるために選定を控えたと明記しています。taxonomy の緩さの主因はピン範囲ではなく **この id ベース交差の非意味性** です。
3. ピンが 2 件しかないのは判断ではなく構造的禁止です（`IMPLEMENTATION_PATHS`）。#2929 が逐語のバリデータ拒否ログ付きで既に起票済みで、「登録は誠実だが被覆が spec より狭い」と結論しています。因果は本文の記述と逆向きですが、主張は弱まらず**修正の依存関係が明確になります**（期待結果 2 前半は #2929 の着地が前提、後半は独立に実装可能）。
4. 意味の同一性は検査されず宣言されるだけです。実装ハッシュ比較は `diffModelMap`（`amadeus-formal-verif-model-map.ts:602-613`）の sha256 一致判定、`plugins/formal-model-check/sensors/amadeus-model-completeness.md:52` は逐語「The flag is a declaration that model semantics did not change.」。
5. drift は「後から広がった」だけでなく「生まれつき」です。landed は 2026-08-07 に着地し、モデルは 2026-08-12 に作られ、以後無改訂です。
6. 乖離は語彙にとどまらず不変量の真偽に達しています（C1 追加所見）。
7. **ただしモデルを直しても今回の 3 件は捕まらない可能性が高い**：#3062/#3110/#3149 はいずれも「最終化への経路が存在しない」= 到達可能性クラスで、`PrConvergenceGate.cfg` は INVARIANT 5 本のみ・`PROPERTY` なし（`PROPERTY` を持つ cfg は `FormalElection.cfg:20` だけ）です。期待結果 1 の drift 検査は「語彙」ではなく「語彙 + 検査プロパティのクラス」を対象にする必要があります。

ラベルについて。`enhancement` は `.github/workflows/issue-labels.yml` の機械導出と一致し、team.md:60 の完了条件判定にも適合します。既存契約 `tla-authoring.md:51-52`「never infer `impl-only` merely because a model already exists」は「モデルが存在すること」を根拠にする誤りを禁じており、観測された「モデルが語彙を持たないこと」を根拠にする誤りは字義上その射程外です。契約違反に当たる部分（terminal-route receipt の永続化未充足）は本文が別起票候補 (b) として正しく切り離しています。`P2` は実害 3 件が既に修正済みである点と整合し、S ラベル不在も正しい状態です。

### 訂正・未解決事項

**訂正候補**

1. 事実 3「stage 自身の分類法ではピン外変更は non-target が正しく」— 反証されました（R2）。
2. 期待結果 2 前半「ピン外変更の route を stage 自身の分類法どおり non-target と記す」— 字義どおり実装すると判定段が J2d で停止します。「被覆不足を判定成果物へ明記し、route は到達可能挙動の変化で決める」への書き換えを推奨します。
3. 事実 1 の「(PR #3081 → #3113 → #3172)」— landed verdict の初出は **#2414（2026-08-07）** で、モデル作成（2026-08-12）より前です。3 PR は差を広げた側という位置づけに直すと主張はむしろ強くなります。
4. 事実 5「BoltPrAttestationGate が author-new された」— 登録受領書の route は **`revise-model`（J5: semantic-change）** です。`.tla`/`.cfg` の新規追加（status `A`）は事実なので「新規モジュールが revise-model ルートで着地した」が正確です。
5. 事実 4「17 コミット中 15 は実装ハッシュ再ピンのみ（モデル改訂 0）」— 括弧が 15 を修飾する読みでのみ真です。17 全体では 2 件（#3036 / #2999、いずれも 8/14）がモデルを改訂しています。
6. 事実 4「8/14 以降は authoring 判定ゼロ」— 母集団が「record を残した 25 実行」であることを明記してください。BoltPrAttestationGate の revise-model 受領書は 2026-08-14T01:39:34Z です。
7. 関連 Issue 節に **#2929（OPEN）** を追加し、期待結果 2 との依存関係を明記してください。あわせて #3187、同根先例 #1921（CLOSED）/ #1510（CLOSED）の追記を推奨します。
8. 影響・価値の「falling proof 5 件」は PrConvergenceGate 固有の値です（BoltPrAttestationGate は 11 件）。登録モデル数は 4、`.tla` モジュール数は 7 です。

**追加を推奨する論点（採否は裁定に委ねます）**

9. 期待結果 1 の drift 検査対象に「検査プロパティのクラス」を含めること（機序 7）。
10. `intersectsRegisteredModel` が bare stable id で交差判定している点は別 Issue 候補です（機序 2）。

**未解決**

- 別起票候補 (b) の「8 件以上」を再現できる述語を特定できませんでした。私の測定では terminal 受領書は厳密に 3 件、record 直下の `applicability-receipt.json` は 1 件（しかも author-new のもの）、分母は下限 7 / 上限 14 です。不足の存在は確実ですが件数は未確定です。
- 「U7」という unit 番号は record から確認できません（dir 名は `formal-election-multiq`）。
- 背景の「スポットチェック 5 件」は repo 外の一次記録に依存し独立検証できません（`tla-reinvest` は repo 全体 0 hit）。ただし「25/25 起動・完走」「判定記録 25/25」は repo だけから再導出できました。

### 同根・対称面

1. **#2929（OPEN）が期待結果 2 前半と正面から重なる**（同一プラグイン・同一優先度・6 日前）。
2. **FormalElection 側はピンに当たっていても同じ結論に落ちる**：`arrivalSequence` を 28 箇所持つ `packages/framework/core/tools/amadeus-election-store.ts` は FormalElection の**ピン内**ファイル（`model-map.json:92-93`）ですが、#3046 の修正は「モデルが語彙を持たない」を根拠に impl-only と裁定され、ハッシュだけ再ピンされました。**ピン被覆を直しても、語彙 drift の腕がなければ同じ判定が再生産されます** — 期待結果 1 と 2 は独立に必要です。
3. **第 3 の同型例が同じ受領書に同居**：`fb1029e47….json` の reason 逐語「FR-1/FR-2 の presence 境界・監査冪等化は humanQuestion BOOLEAN の抽象度の下」。本文は関連 intent 節の将来テストケースとして扱っていますが、既に 3 例目の実績です。
4. **non-target 側にも同じ形の根拠**：`…/260816-open-bug-batch-7/construction/tla-authoring/memory.md:5` 逐語「model-map implPath 11 件と変更 99 ファイルの交差 0 を実測」（こちらは判定表と整合）。
5. **モデル成果物の record 外着地**：`260813-bolt-pr-attestation` は record dir が凍結 SHA に存在せず（intent dir 名 189 件を全列挙して不在確認、陽性対照として `2608` 始まり 80 件）、`intents.json`（185 件）にもありません。登録済み束 `cebe2897…` の approval が指す audit シャードのパスも実在せず、この登録の人間承認 provenance はリポジトリから再検証できません。別起票候補 (c) より強い状態です。
6. **判定記録が判定器を通っていない疑い**：260815-stale-epoch-landed の 3 行は判定器にかけると 2 行が J2d で停止します。record 直下の receipt が全体で 1 件しかないことと整合します（観測）。

### 後続検証者向けメモ

- 全事実は凍結 SHA の object database から取ること。worktree HEAD `215855ea7` は 55 コミット遅れで Issue より古い。
- **zsh**: `git show $SHA:amadeus/...` は `$SHA:a` が修飾子展開され `fatal: ambiguous argument` になります。`"${SHA}:amadeus/..."` と書いてください。
- **git pathspec の無音 0 マッチ**: `-- 'amadeus/spaces/default/intents/*/construction/tla-authoring/*'` は **0 件 exit 0** を返します。`:(glob)` マジックを付けるか `ls-tree -r` 全列挙 + `grep '/tla-authoring/'` にしてください。
- **exit code をパイプ後に取らない**：`git grep -c … | head` の後の `$?` は head の値です。不在主張は必ず非パイプの exit code と陽性対照を対にしてください。
- **判定表の再現**：`git archive <SHA> plugins/formal-model-check/tools` をリポジトリ外へ展開し `ApplicabilityJudge.judge` を直接呼ぶのが最短です。依存はディレクトリ内で閉じています。`traceSubjects` は model-map ではなく `specs/tla-evidence/<digest>.json` の `parts.applicability.subjects` から来ます。
- **コミット日付**：`--since` は committer date、`%ad` は author date。この差で specs/tla の件数が 17 と 19 に割れます。本文の「17」は author date 基準です。
- **route の判定にトークン数え上げを使わない**：`applicability-assessment.md` 内の `author-new` はほぼ全て否定文脈です。
- **用語**：コード上の `TERMINAL_ROUTES` は `{impl-only, non-target}`（`tla-applicability.ts:169`）で、author-new は終端 route ではありません。
- **`SOURCE_DRIFT` と `ModelMapDrift` は別物**です。実装ハッシュ比較は `diffModelMap`、`SOURCE_DRIFT` は model/cfg バイトの seam 跨ぎ検査です。
- **`authoring-subjects.json` の解決先は `specs/tla/` ではなく `specs/` 直下**です（`tla-authoring.ts:516-522` が理由付きで明言）。
- **再検証条件**：#2929 が着地したら期待結果 2 前半の必要性を再評価。`PrConvergenceGate.tla` が 1 度でも改訂されたら「作成以来無改訂」は失効します。

### Verdict

**CONFIRMED_WITH_REFINEMENTS**

中核の欠落 — 適用性判定契約に「モデル語彙と実装の意味的整合を検査する腕」と「欠陥再発による authoring 評価の強制起動」が存在しないこと — は、判定器を実際に走らせて機械的に実証できました。根拠文が判定に一切消費されないこと、実装の終端 verdict 集合がモデルの `TerminalVerdicts` を超えていること、landed レーンの 3 PR が specs を 1 ファイルも触っていないこと、いずれも凍結 SHA で確認済みです。乖離は本文の記述より **古く**（landed は 2026-08-07、モデル作成は 2026-08-12）、かつ **深い**（語彙ではなく `WorkflowGuarded` の真偽）ものでした。

一方で、事実 3 と 期待結果 2 前半の「ピン外変更は non-target」は判定表に照らして誤りであり、そのまま実装すると判定段が停止します。事実 1 の由来、事実 5 の route ラベル、事実 4 の括弧の係り先にも訂正が必要です。加えて、OPEN の #2929 が 期待結果 2 前半と正面から重なりながら未言及であり、申告された 5 述語では発見できませんでした。重複確認の述語集合と 関連 Issue 節の補強を推奨します。

この verdict は Issue の実在性確認であり、実装着手・優先順位・クローズの承認ではありません。


#### j5ik2o — 2026-08-18T07:46:28Z — https://github.com/amadeus-dlc/amadeus/issues/3186#issuecomment-5325181696

## クロスレビュー（2人目・reviewer-2）: CONFIRMED_WITH_REFINEMENTS

<!-- issue-cross-review
review-run-id: xrev-3186-215855ea7-20260818T070859Z
reviewer-id: reviewer-2
execution-subject-id: sha256:2850e1ad8ea45f4a
target-sha: 127be70c5d7a584016f88a5d44e8715904020721
-->

### 独立性と対象

本 Issue の起票・調査に一切関与していない独立実行コンテキストとして、本 Issue のコメント欄を読まずにレビューしました。全事実を凍結 SHA `127be70c5d7a584016f88a5d44e8715904020721`（= origin/main）のオブジェクト DB から再取得し、本文は検証対象の主張として扱いました。GitHub・リポジトリ状態は一切変更していません。起票時 ref `23d4ae767` は凍結 SHA の祖先（5 コミット差）であることを確認済みです。二次観点は主張の網羅性・来歴・影響・ラベル分類・同根/対称面です。

### Claim ledger

| 主張 | 判定 | 独立エビデンス | CORE |
|---|---|---|---|
| C1 `PrConvergenceGate.tla:14` が 4 値で `landed` 不在／実装は landed を持つ | CONFIRMED | 行14逐語 `Verdicts == {"none", "created", "converged", "override"}`。`plugins/github-pr-convergence/tools/pr-convergence-predicate.ts:262` に `verdict: "converged" \| "not-converged" \| "landed"`、同 `pr-convergence-cli.ts:644` に `created → landed` 遷移。PR #3081→#3113→#3172 いずれも MERGED | ✅ |
| C2 drift が impl-only の根拠に転用 | REFINED | `260816-priority-bug-batch-3/construction/tla-authoring/memory.md:5` に引用文言が逐語一致。ただし別事象として書かれた 2 例は同一 intent・同一行・同一時刻（2026-08-17T07:35:00Z）の 1 判定の 2 節。同じ行に未言及の第3の同型節（BoltPrAttestationGate の `humanQuestion` BOOLEAN）あり | ✅ |
| C3 ピン 2 件／状態機械は plugin 側／「8 ファイルがピン外」 | 事実 CONFIRMED・機序 REFINED | model-map 実読で両ゲートとも pins=2（`amadeus-orchestrate.ts` / `amadeus-state.ts`）、`plugins/` 配下 0 件。260815 の判定成果物に逐語「8 files 変更のうち engine 側 0」。**ただし 2 件制限はヒューリスティックではなく validator 強制**（`amadeus-formal-verif-model-map.ts:237-240` の `IMPLEMENTATION_PATHS`） | ✅ |
| C4 25 実行中 author-new 1／8-14 以降 0／17 中 15 が再ピン | CONFIRMED（凍結時点 26） | 判定 dir は起票時 ref 25・凍結 26（追加は `260817-inception-cost-batch`、route `not-applicable`）。author-new は `260811-pr-convergence-gate` のみ。specs/tla 17 コミット中 15 が model-map.json のみ。**8/15 以降 `.tla`/`.cfg` 変更は 0 件** | ✅ |
| C5 実害クラスタ＋誤作成 PR #3109／対照 #2999 | CONFIRMED | #3062/#3110/#3149 いずれも CLOSED bug。#3109 は #3080 と同一 head OID `eb7bea3c8345`、マージ 9 時間後に作成・7 秒で close・未マージ、#3110 起票の 3 分前。#2999 は `BoltPrAttestationGate.tla`/`.cfg` を新規追加(A)で着地 | ✅ |
| C6 requires_stage 後置／U7 成果物／record 0 ファイル | CONFIRMED | stage frontmatter `requires_stage: [build-and-test]`、`unit-of-work.md:67` 逐語 `## U7: formal-election-multiq`、PR #2999 は 38 ファイル中 intent record 0 件 | |
| C7 重複不在／#2766 CLOSED・#2289 OPEN | REFINED | #2766・#2289 の状態は正確。**しかし #2929（OPEN, enhancement/P2, 本 Issue の 6 日前に起票）が未引用**で期待結果 2 と実質的に重なる。別起票候補 (a)(b)(c) は起票 5 分後に #3187/#3188/#3189 として実在 | |
| C8 `enhancement` / `P2` の妥当性 | CONFIRMED | team.md の完了条件判定を上から適用し (4)「契約を追加」に該当。既存契約違反は不在。先例 #2289 が同 plugin・同クラスで enhancement/P2 | |
| C9 完了条件の検証可能性 | CONFIRMED_WITH_REFINEMENTS | 1・4・5 は第三者確認可能。5 の two-layer 整合主張は成立（信号時の裁定強制であり一律義務化ではない）。2 は規範的前提が未確立かつ #2929 未解決では構造的に充足不能。3 は閾値未確定を明示した誠実な繰延。**なお期待結果 1 は既存の `semantic-change` 分類と既存の revise-model 強制規則へ接続する形が適切**（下記「機序」参照） | |
| C10 authoring-hold は常時 no-hold | CONFIRMED | `authoring-subjects.json` はリポジトリ全体で 0 件。`tla-authoring.ts:509-510` 逐語「A workspace that declares nothing governs nothing, which is a real no-hold」。実効発火は `amadeus/config.json:49` の scope-binding | |
| C11 本文様式適合 | CONFIRMED | `.github/ISSUE_TEMPLATE/enhancement.yml` の必須 9 フィールド・team.md の必須 6 要素を充足。事実/観測/仮説のラベリングは実態と一致（フィールド順序のみテンプレート順と相違） | |

### 再現・コード実読

凍結 SHA でのオブジェクト DB 読取のみを使用しました。不在主張は選言をまとめず、**1 トークン 1 実行・`-F` 固定文字列・個別 exit code** で再実測しています（選言述語は空出力と述語失敗を区別できないため）。

```
git show <SHA>:amadeus/spaces/default/specs/tla/PrConvergenceGate.tla | sed -n '14p'
→ Verdicts == {"none", "created", "converged", "override"}                  exit=0

git grep -n -F 'landed' <SHA> -- amadeus/spaces/default/specs/tla
→ 4 hits、いずれも MirrorLifecycle の散文（syncLanded 系）                   exit=0
   陽性対照: 'converged' 11 hits / 'Verdicts' 10 hits                        exit=0

git grep -n -F 'arrivalSequence' <SHA> -- amadeus/spaces/default/specs/tla   exit=1（0 hit）
   陽性対照: FormalElection*.tla の 'accepted' 18+4 hits                     exit=0
git grep -c -F 'arrivalSequence' <SHA> -- 'packages/framework/core/tools/amadeus-election*.ts'
→ amadeus-election-store.ts:28                                              exit=0

specs/tla の 2026-08-14 以降コミット: 17 件（model-map.json のみ 15 / .tla・.cfg 込み 2）
2026-08-15 以降の .tla・.cfg 変更: 0 件（陽性対照: 同期間の model-map.json 11 件）
```

判定契約 `plugins/formal-model-check/stages/tla-authoring.md`（全 181 行）のトークン別実測。
`git grep -n -i -F "<token>" <SHA> -- <path>` を 1 トークンにつき 1 回:

| token | hits | exit | 所在 |
|---|---|---|---|
| `drift` | 0 | 1 | — |
| `vocabular` | 0 | 1 | — |
| `語彙` | 0 | 1 | — |
| **`semantic`** | **1** | **0** | `:51` ``Classify them as `new-subject`, `semantic-change`, `impl-only`, or`` |
| `意味的` | 0 | 1 | — |
| `recurr` | 0 | 1 | — |
| `regression` | 0 | 1 | — |
| `再発` | 0 | 1 | — |
| `repeat` | 0 | 1 | — |

いずれの exit も 1（不一致）であり 2（エラー）は 0 件のため、述語自体の異常終了は発生していません。関連語の全数: `semantic-change` 1 hit（:51）、`reachable` 2 hits（:28 は無関係・:56）、`behaviour` 2 hits（:47・:56）、`behavior` 0 hit（exit=1）。

実装側の状態機械（`pr-convergence-cli.ts:639-646`）:

```typescript
function transitionAllowed(current: string, next: string): boolean {
  // `created -> landed` is the merge-queue finalisation (#3062): auto-merge
  // landed the pull request before `report` ran, so the epoch closes on the
  // merge fact instead of a convergence verdict. ...
  if (current === "created") return next === "converged" || next === "override" || next === "landed";
  return current === "override" && next === "converged";
}
```

### 機序・影響・ラベル

判定契約 Step 1 を全文実読し、**(a) クラスを名指す分類ラベル / (b) 条件を検出する手順・基準 / (c) 検出時に裁定を強制する規則**を分けて評価しました。

- **(a) 分類ラベルは存在します。** `:51` に `semantic-change` が 4 分類の 1 つとして実在します。したがって判定契約は意味的変化について沈黙してはいません。
- **(b) 検出手順・基準は不在です。** `:50` は「Compare the selected subjects with the registered model map and the current change」と比較の**対象**を述べますが、比較の**方法**を規定しません。実装の状態・遷移・verdict 語彙とモデル語彙を突き合わせる指示はなく、「モデルが概念を表現できないこと自体が drift の証拠である」という規定もありません。検出側の語彙（`drift` / `vocabular` / `語彙` / `意味的`）はいずれも 0 hit です。
- **(c) 強制規則は存在し、当初評価より強力です。** `:55-56` は「a registered set whose reachable behaviour changed **must** route to `revise-model`」と必須形で規定し、`:52` が「never infer `impl-only` merely because a model already exists」という近道禁止規則を添えています。

したがって欠落は当初記載より**狭く、位置が特定されます**: 契約はクラス (a) と強制規則 (c) を既に持ち、欠けているのはそれらを発火させる述語 (b) です。「reachable behaviour changed」の判定方法が未定義であるため、実運用ではピン範囲に限定して評価され、判定者は engine 側の到達可能挙動が無変更であると正直に報告できてしまいます。本 Issue の期待結果 1 が求めているのは、まさにこの (b) です。再発トリガの腕は 4 トークンすべて 0 hit で、完全に不在のままです。

この訂正から 2 点が導かれます。(i) 実装は並行する新分類を設けるのではなく、既存の `semantic-change` クラスと既存の revise-model 強制規則へ接続する形が適切です。(ii) 観測された `impl-only` 判定は `:52` の近道禁止規則に当初評価より**近い**位置にあります。ただし `:52` はモデルの**存在**からの推論を禁じるもので、モデルの**語彙**からの推論は射程外であるため、本件は `bug` ではなく `enhancement` のままです。

drift 機構がバイト水準・宣言水準に留まる点も確認しました。sensor は「recalculates SHA-256 for every canonical implementation entry」と明記し、`--impl-only` フラグは逐語で **"a declaration that model semantics did not change"**、すなわち検証されない宣言です。もう一つの drift クラス（`compareModuleDeclarations` による `ModuleDeclarationDrift`）は TLA モジュール依存宣言の照合であり、実装意味論の照合ではありません。

ピン 2 件は判定者の緩さではなく validator による構造的強制です（`IMPLEMENTATION_PATHS` が 2 プレフィクスのみを許可）。ただし本 Issue の中核はこれに還元されません。`FormalElection` はピンが実装を完全に覆っている（5/5）にもかかわらず、`arrivalSequence` が被ピン実装に 28 回・モデルに 0 回であり、ピンが正しくてもバイト再ピンだけでは意味的乖離が蓄積することを示します。

ラベルは妥当です。完了条件判定を上から適用すると、裁定だけでは閉じず、文書面だけの変更でもなく（stage 契約は機械消費され期待結果 4 が実行可能ゲートを要求）、既存の合意済み契約への違反も不在で、「契約を追加」に該当します。先例 #2289 が同 plugin・同クラスで `enhancement` / `P2` です。`P2 = 重要だが急がない` も、引用された 3 件が既に修正済みで残るのは防御力の逓減である以上、妥当と判断します。

### 訂正・未解決事項

- **本レビュー自身の訂正（1 件）**: 初版で判定契約の不在述語を選言 1 本で記載し、`semantic` を 0 hit と記述しましたが誤りでした。トークン別再実測により `semantic` は `:51` の `semantic-change` に 1 hit します（実際に実行した述語は `semantic integrity` = 0 hit であり、報告時にトークンを広く転記した私の誤りです）。この訂正により機序評価は上記のとおり (a)+(c) 既存・(b) 欠落へ精緻化されますが、報告された欠落そのものは解消しません
- **C3 の機序表現**: 「ピン範囲ヒューリスティック」は不正確で、実際は validator による拒否（#2929 に逐語 `entries[2].implPath is outside the canonical implementation boundary`）。観測事実自体は影響を受けません
- **C3 の分類主張**: 「ピン外変更は non-target が正しい」は事実 3 の中に事実として置かれていますが、stage 契約は 4 分類を列挙するのみで定義を与えていません。期待結果 2 がこの解釈に依存するため、解釈として明示することを推奨します
- **C7 の網羅性（唯一の実質的な欠落）**: **#2929**（OPEN, `enhancement` / `P2`、本 Issue の 6 日前に起票）がピン被覆の根本を既に文書化し、同じ影響（「実装変更時にモデルが silently stale になる」）を述べています。期待結果 2 は実質的に重なり、#2289 を前提部品として挙げるのと同じ位置づけで参照されるべきです。宣言された 5 述語（`applicability` / `revise-model` / `tla-authoring` / `語彙 drift` / `authoring-hold`）はいずれも #2929 の題名に一致しないため、見落としの経緯は説明可能です
- **本文の表現**: 本 Issue は判定契約に「腕がなく」と述べますが、正確には分類クラス `semantic-change` と revise-model 強制規則は既存で、欠けているのは検出述語です。提案の実質は変わりませんが、実装形の設計時にはこの区別を前提にしてください
- **C2 の事象構造**: 引用された 2 例は独立した 2 判定ではなく 1 判定記録の 2 節であり、同じ行に第 3 の同型節が併存します
- **現行性（いずれも中核を損なわない）**: 凍結 SHA では実行数は 25 でなく 26（追加分 `260817-inception-cost-batch` は route `not-applicable` で連続記録を延長）。別起票候補 (a)(b)(c) は起票の約 5 分後に #3187 / #3188 / #3189 として起票済みで、記載は起票時点では正確です
- **未検証**: 影響節の「falling proof 5 件」は独立確認できませんでした（"falling proof" に言及する *ファイル* が 5 件、`specs/tla-evidence/` は 6 エントリ）。「モデル改訂 0」は多義的で、17 コミット全体を指す読みでは PR #3036 の `FormalElection.tla` 406 行改訂が反例になりますが、これは追認ではなく authoring/抽出です

### 同根・対称面

`amadeus/spaces/default/specs/tla/` 配下の全 7 モジュール（うち登録 4 件）を走査しました。

1. **`BoltPrAttestationGate.tla:22` が同一の欠陥を持ちます** — 逐語 `Verdicts == {"none", "created", "converged", "override"}` で `landed` 不在。同じ report/verdict ライフサイクルを写像しています。本 Issue は題名を含め PrConvergenceGate のみで実証しており、**エビデンス基盤は主張より 1 モジュール広い**です
2. **`FormalElection` はピン被覆が完全なまま同種の乖離を示します**（`arrivalSequence` が被ピン実装に 28 回・モデルに 0 回）。これは乖離がピン欠落に還元されないことの直接証拠であり、#2929 の解決だけでは本件が閉じないことを意味します
3. **引用元の記録そのものに第 3 の同型節**（`humanQuestion` の BOOLEAN 抽象）があり、事実 2 では数えられていません
4. **sensor の発火条件の非対称性（本文に記載なし）**: `matches` glob に対する被ピン実装の被覆は BoltPrAttestationGate 0/2、PrConvergenceGate 0/2、FormalElection 5/5、MirrorLifecycle 4/4。**`landed` 乖離を示す 2 モデルが、実装変更で advisory drift sensor が発火しない唯一の 2 モデル**です（バイト水準の担保は formal-verif の CI スイート経由で残るため、advisory 信号の欠落であって強制力の全面不在ではありません）
5. intent `260813-election-multiq` は `tla-authoring` を `not-applicable` としつつ、同 intent の PR #3036 で `FormalElectionCore.tla` 新規追加と `FormalElection.tla` の 406 行改訂を行っています

### 後続検証者向けメモ

- **選言述語を不在の根拠にしない**: 複数トークンを `|` で連ねた 1 実行は、空出力と述語失敗を区別できません。不在は **1 トークン 1 実行・`-F`・個別 exit code** で採ってください。本レビュー初版はこの規律を破って `semantic` を 0 hit と誤記し、再実測で 1 hit（`semantic-change` の部分文字列）と判明しました。**部分文字列一致は分類ラベルを拾う**ため、検出手順の不在を示すつもりのトークンがラベルに当たっていないかを必ず確認してください
- **exit の読み方**: `exit=1` は「エラーなし・不一致」、`exit=2` がエラーです。ugrep ラッパ環境では `\b` と長い選言を避けてください
- **zsh の `:a` 修飾子**: `git show $S:path` が絶対パスへ黙って書き換わり `fatal: ambiguous argument` になります。必ず `git show "${S}:path"` と書いてください
- **intent の走査**: `260804-tla-authoring` という名の intent が存在するため素朴な grep は汚染されます。パス片 `/construction/tla-authoring/` で絞ってください
- **route はキーワード数で数えない**: 判定成果物は「author-new へは進まない」のような否定形で語彙を含みます。見出しの `(terminal: …)`、`## 結論`、または `applicability-receipt.json` の `"route"` を読んでください。構造的な目印として、authoring 成果物一式（`draft.json` / `invariants.json` / `registration-receipt.json` / `proof-receipt.json` / `trace-*.json`）を持つのは `260811-pr-convergence-gate` のみです
- **ref を明示する**: 起票時 ref では 25、凍結 SHA では 26 です。数値ごとにどちらの ref かを併記してください
- **specs/tla のコミット分類**: `git show --name-status <c> -- amadeus/spaces/default/specs/tla` で再ピンとモデル改訂が分離でき、`A` と `M` で author-new と改訂が分離できます
- **重複検索の述語**: 提案側の語彙だけでなく機序側の名詞（`model-map` / `IMPLEMENTATION_PATHS` / `pin` / `drift 検知`）を含めてください。#2929 はこれで発見できます

### Verdict

**CONFIRMED_WITH_REFINEMENTS** — 中核 C1・C2・C4・C5・C6・C10・C11 は凍結 SHA の一次資料で成立し、報告された欠落（適用性判定に語彙 drift の**検出述語**と欠陥再発トリガが存在しないこと）は実在します。トークン別再実測でも `drift` / `vocabular` / `語彙` / `意味的` と再発系 4 トークンはすべて 0 hit です。訂正は、判定契約が分類クラス `semantic-change` と revise-model 強制規則を既に持つこと（欠落は検出述語に限局される）、C3 の機序表現（ヒューリスティックではなく validator 強制）、C2 の事象構造（2 判定ではなく 1 判定の 2 節＋未言及の第 3 節）、および C7 の網羅性（既存 OPEN の #2929 が未引用で期待結果 2 と重なる）に限られ、いずれも中核の成立を覆しません。同根面として、同一の `landed` 乖離が `BoltPrAttestationGate` にも存在し、`FormalElection` はピン被覆が完全なまま同種の乖離を示すため、エビデンス基盤は本文の主張より広いと判断します。

この verdict は Issue の実在性確認であり、実装着手・優先順位・クローズの承認ではありません。


### その他コメント(verbatim、任意)

(なし)

## Issue #2289: enhancement(formal-model-check): registration committer に revise-model の replace-by-name 登録を追加する

- state: OPEN / labels: 未取得(本 verb の read 面は本文・状態・コメントのみ) / url: https://github.com/amadeus-dlc/amadeus/issues/2289 / target-sha: e86fbe125c85ddcbe7264f3a9a9a2377a06136da
- review-run-id: XR-260820-2289 / 独立レビュアー: 2名(marker 計数)

### 本文(verbatim)

## エレベーターピッチ

既存 TLA+ モデルの改訂(revise-model)を登録まで完結 したい
formal-model-check plugin で TLA+ モデルを保守する開発チーム 向けの、
registration committer の replace-by-name 登録 というプロダクトは、
U4 registration committer の意味論拡張 です。
これは route=revise-model の draft が既存同名エントリを置換して model-map.json へ commit できること ができ、
現行の append + validator fail-closed 意味論(同名 revise は常に validator-rejected で loud 拒否) とは違って、
route 依存の compose(revise-model = 同名置換 / author-new = append、置換対象不在や author-new の同名衝突は従来どおり拒否) が備わっている。

## 背景・対象範囲

intent 260804-tla-authoring(#2161)の U4 registration-committer(PR #2287)は、承認済み functional-design(business-logic-model.md §1 手順3)どおり「snapshot に draft を append した全体を validator 検証(name 重複は validator-rejected)」を実装した。一方 FD 手順1a は route=author-new / revise-model の両方を受理するため、**既存 model-map.json に同名エントリがある revise-model draft は構造的に commit 不能**(常に validator-rejected)という設計上の緊張が残る。

Cursor Bugbot が PR #2287 で High 指摘として検出し、ソロ選挙 E-TLA-U4REV(2026-08-05、2-0)で「A: 現状受理 + 後続 Issue」と裁定された — 拒否は loud で fail-closed(map 破壊・無音成功なし)のため実害は機能ギャップに限定され、承認済み FD からの逸脱を PR 収束中に実装しない(P3)。本 Issue がその後続受け皿である。

対象範囲:
- `composeRegisteredMap`(`plugins/formal-model-check/tools/tla-registration.ts`)を route 依存にする: revise-model = 同名既存エントリの置換 / author-new = append(同名衝突は従来どおり validator-rejected)
- FD(`amadeus/spaces/default/intents/260804-tla-authoring/construction/registration-committer/functional-design/business-logic-model.md` 手順3)の改訂を裁定込みで行う
- 置換の TDD テスト(置換成功 / 置換対象不在 / author-new 同名衝突の3面)

## 根拠・実測証拠

- `plugins/formal-model-check/tools/tla-registration.ts` の `composeRegisteredMap` — `[...models, draft].sort(...)` の無条件 append(PR #2287)
- FD business-logic-model.md 手順1a(revise-model 受理)と手順3(「name 重複等のエントリ間不変量を書込前に閉じる」= append 前提)の併存
- requirements.md FR-010 は replace 意味論を規定せず、FR-012 の E2E は「新規 authoring または改訂」のどちらかで充足可能
- 選挙記録: `amadeus/spaces/default/elections/260805-e-tla-u4rev/record.md`(A 採用 2-0、GoA 賛成2)

## 期待結果・完了条件

1. route=revise-model の draft が同名既存エントリを置換して commit に成功する(receipt 返却・atomic replace・競合検知は現行契約を維持)
2. revise-model で置換対象(同名エントリ)が不在の場合は loud 拒否(無音 append へ降格しない)
3. author-new の同名衝突は従来どおり validator-rejected
4. FD 手順3 の改訂が record に裁定付きで残る
5. 既存テスト(t448/t449)グリーン維持 + 置換3面の新規テスト

## 影響・価値

TLA+ authoring 工程の改訂ループ(モデル改訂 → 再検証 → 再登録)が end-to-end で完結する。現行は改訂後の再登録が構造的に不能で、model map の更新に手動編集(監査外の書込)を誘発しうる。

## 代替案・非採用理由

- 本 PR(#2287)で即実装する案 — 選挙 E-TLA-U4REV で不採用(0票)。承認済み FD からの逸脱を PR 収束中に実装しない(P3)、拒否は loud fail-closed で実害が限定的
- 同名 revise を「旧エントリ削除 → author-new で再登録」の2操作で回避する案 — 削除操作自体が未実装であり、削除+追加の2 commit は原子性(FR-010)を破る窓を作るため非採用

## 関連 Issue・PR・intent

- #2161(intent 260804-tla-authoring)
- PR #2287(U4 registration-committer — 本指摘の検出元)
- #2286(同 intent の後続 Issue: 変異系実 TLC)
- record: `amadeus/spaces/default/intents/260804-tla-authoring/construction/registration-committer/`


### クロスレビューコメント(verbatim、コメント URL 併記)

#### j5ik2o — 2026-08-20T07:13:29Z — https://github.com/amadeus-dlc/amadeus/issues/2289#issuecomment-5352645116

## クロスレビュー（1人目・reviewer-1）: CONFIRMED_WITH_REFINEMENTS

<!-- issue-cross-review
review-run-id: XR-260820-2289
reviewer-id: reviewer-1
execution-subject-id: subj-sha256:3c1822a5fdd58603
target-sha: e86fbe125c85ddcbe7264f3a9a9a2377a06136da
-->

### 独立性と対象

fresh context の reviewer-1 として、他方のレビュアーの所見・本 Issue の既存コメントを一切参照せずに実施した。GitHub は照会・変更していない。リポジトリは read-only で扱い、再現はリポジトリ外の scratch で実行し、作業後の `git status --porcelain` は空。二次レンズは「再現・現行コード機序・反証」。判定は自分で実行したコードの出力と file:line の実読のみから導いており、Issue 本文・選挙票の rationale は検証対象として扱った。

対象断面は `e86fbe125c85ddcbe7264f3a9a9a2377a06136da`（`git rev-parse HEAD` 実測、exit 0）。

### Claim ledger

`*` は core claim。

| # | 主張 | 判定 | 一次証拠 |
|---|---|---|---|
| C1 * | `composeRegisteredMap` は無条件 append | CONFIRMED | `plugins/formal-model-check/tools/tla-registration.ts:235` 逐語 `const composed = [...models, draft].sort((left, right) => {` |
| C2 * | 同名既存エントリを持つ revise-model draft は常に validator-rejected | CONFIRMED | 実行再現（下記 B/E） |
| C3 * | FD 手順1a は両 route を受理 | CONFIRMED | `.../functional-design/business-logic-model.md:19-20` 逐語 `pre.applicability の route が author-new / revise-model であること` |
| C4 | 拒否は loud で fail-closed（無音成功なし） | 精緻化 | 同名 arm は真。別 arm に無音成功が実在（F1） |
| C5 | FR-010 は replace 意味論を規定しない | CONFIRMED | `.../requirements-analysis/requirements.md:97` |
| C6 | FR-012 は「新規authoringまたは改訂」の選言 | CONFIRMED | 同 `:105` 逐語 |
| C7 | 選挙 E-TLA-U4REV は 2026-08-05、2-0、GoA 賛成2 | CONFIRMED | `amadeus/spaces/default/elections/260805-e-tla-u4rev/tally.json`：`choice1 count 2` / `choice2 count 0` / `goa.favor 2` / `talliedAt 2026-08-05T13:21:57Z` |
| C8 | 検出元は PR #2287 | CONFIRMED | `bb0e3b479`（`composeRegisteredMap` の初出コミット） |
| C9 | 削除操作は未実装 | CONFIRMED | 対照付き census で削除系 API 0 件 |
| C10 | 手動編集（監査外の書込）を誘発しうる | 精緻化 | 宣言面は真、識別子面には認可済み別経路が既存（F2） |
| C11 | 完了条件5「t448/t449 グリーン維持」 | CONFIRMED（制約あり） | t448 は 26 pass / 0 fail / exit 0。ただし F3 |

### 再現・コード実読

リポジトリ外の scratch スクリプトから、リポジトリのモジュールを import して実行した（exit 0）。

```
A. composeRegisteredMap.length = 2                      ← route は引数に存在しない
B. revise-model + 同名 → ok=false
   {"kind":"validator-rejected","detail":"models must be unique and sorted by name"}
C. 別名（対照）      → ok=true  names=["Election","Mirror"]
D. gate: author-new=true / revise-model=true / bogus-route=false
E. commit() end-to-end（本物の HUMAN_TURN 承認を合成してゲート通過）
   revise-model + Mirror（既存名） → ok=false validator-rejected  published=null（map 無傷）
   revise-model + Absent（不在名） → ok=true  receipt 返却        published=BYTES
   author-new   + Mirror           → ok=false validator-rejected  published=null
   author-new   + Election         → ok=true  receipt 返却        published=BYTES
```

機序は次の連鎖で構造的に確定する。前提ゲート（`tla-registration.ts:110`）は `AUTHORING_ROUTES` に `revise-model` を含むため route を通すが、`composeRegisteredMap`（`:229-243`）は route を引数に取らず（実測 arity 2）常に append する。validator は `amadeus-formal-verif-model-map.ts:615` の `if (model.value.name <= previousName) return invalid("models must be unique and sorted by name")` で厳密昇順を要求するため、同名 2 件は sort 後に隣接して必ず invalid になる。本番経路は `tla-authoring.ts:830,838` の 1 本のみで迂回路はない。

currentness: `composeRegisteredMap` の本体は `bb0e3b479`（#2287）から対象 SHA まで**バイト同一**（4 断面を `git show` で照合）。動いたのは行位置のみ（`:223-236` → `:229-243`、#3263 が上流に provenance 検査を追加したため）。`replace-by-name` の census は 0 hit / exit 1（対照 `composeRegisteredMap` は 2 ファイル / exit 0 で述語健全）＝未実装。

削除操作の不在も対照付きで確認した（対照 `RegistrationCommitter` は 2 ファイル hit）。`unregister` の唯一の hit は `plugins/formal-model-check/stages/tla-authoring.md` の散文 `unregistered` のみで、`deregister` / `removeEntry` / `deleteModel` / `RegistrationRemover` は 0 件。代替案の非採用理由は成立する。

### 機序・影響・ラベル

Issue の根拠より**強い証拠が出荷物側にある**。`plugins/formal-model-check/stages/tla-authoring.md:55-56` は逐語で `An unregistered selected set must route to author-new; a registered set / whose reachable behaviour changed must route to revise-model.`、`:64-65` は `Only author-new and / revise-model continue to step 2.` と定める。つまり出荷済みステージ契約が「登録済みモデルの振る舞いが変わったら必ず revise-model へ送り、その route は登録段まで進む」と命じる一方、登録段はその route の draft を全件拒否する。本件は「FD 内部の設計上の緊張」よりも、**出荷契約が自ら必須と定めた経路を完走できない**という強い形をしている。根拠節にこの 2 箇所を追記することを推奨する。

ラベル `enhancement` + `P2` は妥当。`cid:requirements-analysis:issue-type-decision` を完了条件で上から適用すると、(1) 回答だけでは閉じない (2) コード変更を伴う (3) 実装は承認済み FD 手順3（`business-logic-model.md:31-33`, `:40`）の逐語どおりで無申告逸脱がなく、出荷ステージ契約 `tla-authoring.md:149-151` は `A refused registration is a halt: the subject stays unregistered, the previous / model map is left byte-for-byte intact` と拒否自体を正当な halt として明記しており成功を約束していない → bug は発火しない (4) よって契約を追加する `enhancement`。ただし下記 F1 のみを切り出すなら fail-open であり `bug` に該当しうる。

### 訂正・未解決事項

訂正は 2 点。(1) 選挙票が引く `tla-registration.ts:223-236` は現行断面では `:229-243`（本体バイト同一、#3263 による行シフト）。実装時は現行行を採ること。(2) 背景節の「拒否は loud で fail-closed（map 破壊・**無音成功なし**）」は、同名 arm 限定の主張へ限定すべき（F1）。

未解決は 3 点。(a) 重複 Issue の有無は未検証（GitHub 非照会の制約下で実施。リポジトリ内では intent record 3 箇所で `#2289` が台帳化済み・実装未着地であることのみ確認）。(b) F2 が示す governance 非対称を本 Issue の範囲に含めるかは仕様裁定であり、ユーザー専権と考える。(c) `t449` は filesystem を触る integration test のため未実行（t448 のみ実行）。

### 同根・対称面

**F1（背景節の訂正・完了条件2の補強）**: `route=revise-model` で map に**存在しない**名前の draft を出すと、現行実装は `ok=true` で receipt を返し map を実際に書く（実測 E の 2 行目、`published=BYTES`）。`commit`（`tla-registration.ts:314-355`）は `candidate.applicability` の subject と `draft.name` を一切突き合わせないため、この cross-check は構造的に不在。出荷契約上 revise-model は登録済み集合にしか発行されない想定だが、防御は効いていない。したがって完了条件2は「新機能の設計制約」ではなく**現存する fail-open の是正**であり、その正当性はむしろ補強される。

**F2（影響評価の精緻化）**: 「手動編集を誘発しうる」は半分だけ過大。`plugins/formal-model-check/tools/amadeus-sensor-model-completeness.ts` の `updateModelMap`（フラグなし、`:1000-1078`）は `canonicalRecord`（`:733-776`）で `map.models` を写像しつつ model / cfg / impl / auxiliary の identity のみを再計測して atomic publish するため、改訂の**識別子面は 6 前提ゲートを通さず既に実行可能**。一方 `canonicalRecord` は name・vocabulary・evidenceBundle を素通しするので、改訂の**宣言面**（不変量集合の変更、改訂版 evidence bundle の束縛）は registration committer 以外に経路がない。現状は「認可の薄い経路だけが生き、6 前提ゲート付き経路が死んでいる」非対称であり、表現を変えれば Issue の懸念はむしろ強まる。

**F3（実装制約）**: `tests/unit/t448-tla-registration.test.ts:294-307` は同名 draft の `validator-rejected` を pin しているが、この呼び出しは 2 引数で route を渡さない。完了条件5を満たすには route 不在時の既定を append に保つ必要がある。保てない場合はこの pin の改訂が裁定事項になる。

**F4（本 Issue のスコープ外・別 Issue 推奨）**: `tests/unit/t448-tla-registration.test.ts:2` と `:3` は**完全に同一の module specifier** を import しており（いずれも `../../plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts`）、`:74-82` のテスト `the shipped plugin copy reaches the same verdicts` はモジュールを自分自身と比較している（ランタイム確認: `same module object = true`）。#2287 時点では `:2` が `packages/framework/core/tools/...` を指す二経路比較だったが、#2890 が core 側パスを畳んだ際に意図が無音退化した（`git log -S` で特定）。team.md Forbidden の「自己参照比較（x === x）＝検証劇場」に該当するため、別 Issue での起票を推奨する。

### 後続検証者向けメモ

`composeRegisteredMap` を直接叩くだけでは前提ゲートを通らないため、`commit` の end-to-end を見るには承認 provenance を本物にする必要がある。`tla-applicability.ts:441-457` の `verifyHumanApproval` は「shard 各行の sha256 が `eventIdentity` と一致・`timestamp` 一致・`attributes.Event === "HUMAN_TURN"`（または `eventName === "amadeus.human.turn"`）」を要求するので、`JSON.stringify({timestamp, attributes:{Event:"HUMAN_TURN"}})` を作ってその sha256 を approval に束縛すれば通る。これを省くと `approval-provenance-invalid` で止まり、validator 到達前の失敗を「再現できなかった」と誤読する。

census には対照リテラルを必ず同居させること（ugrep ラッパの無音失敗・zsh 語分割対策）。本レビューでは `composeRegisteredMap` / `RegistrationCommitter` を対照に使い、`replace-by-name` の 0 hit（exit 1 = 不一致であってエラーではない）を不在の根拠に採用した。

currentness は「引用行が動いたか」ではなく「関数本体がバイト同一か」で判定すること。本件は #3263 が上流に検査を足したため全行が 6 行下へ動いており、行番号だけを見ると変更されたように誤読する。

### Verdict

`CONFIRMED_WITH_REFINEMENTS`

この verdict は Issue の実在性確認であり、実装着手・優先順位・クローズの承認ではありません。


#### j5ik2o — 2026-08-20T07:13:30Z — https://github.com/amadeus-dlc/amadeus/issues/2289#issuecomment-5352645265

## クロスレビュー（2人目・reviewer-2）: CONFIRMED

<!-- issue-cross-review
review-run-id: XR-260820-2289
reviewer-id: reviewer-2
execution-subject-id: subj-sha256:df12753b134f61a4
target-sha: e86fbe125c85ddcbe7264f3a9a9a2377a06136da
-->

### 独立性と対象

もう1名のレビュアーの作業内容・結論を参照せず、本 Issue および他 Issue の既存コメントを読まずに実施しました。対象は SHA `e86fbe125c85ddcbe7264f3a9a9a2377a06136da`（`git rev-parse HEAD` で実測一致）。リポジトリと GitHub 状態は無変更（`git status --porcelain` 0 行）、再現は repo 外の scratch でのみ行いました。二次レンズは主張の網羅性・起源／履歴・影響・ラベル・同根／対称面です。

### Claim ledger

CORE と記した5件が本 Issue の成立根拠です。全13件 CONFIRMED。

| # | Claim | 判定 |
|---|---|---|
| C1 **CORE** | `composeRegisteredMap` が route を問わず無条件 append | CONFIRMED |
| C2 **CORE** | 同名エントリ存在下の revise-model draft は構造的に commit 不能 | CONFIRMED（対照実験） |
| C3 **CORE** | FD 手順1a が revise-model を受理 | CONFIRMED |
| C4 **CORE** | FD 手順3 が append 前提 | CONFIRMED |
| C5 **CORE** | 起源は PR #2287 の承認済み FD 準拠実装 | CONFIRMED |
| C6 | 選挙 E-TLA-U4REV 2-0・GoA 賛成2 | CONFIRMED |
| C7 | FR-010 は replace 意味論を規定せず | CONFIRMED |
| C8 | FR-012 は「新規 authoring または改訂」で充足可 | CONFIRMED |
| C9 | 拒否は loud fail-closed、map 破壊・無音成功なし | CONFIRMED |
| C10 | 削除操作は未実装 | CONFIRMED |
| C11 | 手動編集（監査外の書込）を誘発しうる | CONFIRMED（補強） |
| C12 | t448/t449 が存在 | CONFIRMED（完了条件5は要精緻化） |
| C13 | 現時点でも未実装のまま live | CONFIRMED |

### 再現・コード実読

**対照実験**: 同一の draft オブジェクトを、同名エントリを「持つ／持たない」snapshot にのみ差をつけて `composeRegisteredMap` へ投入しました。

```
CONTROL  (name absent) -> OK(committable)
TREATMENT(name present)-> REJECTED models must be unique and sorted by name
EXIT=0
```

初回試行では対照群を「新しい名前の draft」で組みましたが、canonical path 規則という無関係な理由で落ちたため対照として無効と判断し、上記の設計に組み直しました。これにより拒否が名前衝突に固有であることが確定します。

**起源／履歴**: `git log --follow` で当該ファイルの全履歴は3コミット。`bb0e3b479`（PR #2287、新規349行）が `composeRegisteredMap` を導入し、以後 `39c6093cb`（#2793）と `e461fea3c`（#3263）が触れていますが、#3263 は `parseEntryDraft` に authoringProvenance 要求を追加したのみで compose の意味論は不変です。よって本ギャップは現時点でも live です。

**起票タイミング**: Issue 起票 2026-08-05T13:24:17Z は PR #2287 マージ 2026-08-05T15:03:59Z より約1時間39分早く、選挙 subagent-1 の留保「マージ前に起票」は充足されています。

**引用の実在確認**: FD 手順1a（`business-logic-model.md:19`）、手順3の「draft を加えた全体」（同 `:30-32`）、FR-010（`requirements.md:97`、replace 不規定）、FR-012（同 `:105`、「新規authoringまたは改訂」）、選挙記録（choice1=2票 choice2=0票、GoA 2x2）をいずれも逐語で確認しました。

### 機序・影響・ラベル

`checkApplicability`（`tla-registration.ts:110`）は route を検証しますが、その値は `commit` 内で `composeRegisteredMap(snapshot.value, draft.value)`（`:338`）へ渡されません。compose は `:235` で route を問わず append し、validator（`amadeus-formal-verif-model-map.ts:615`）が `name <= previousName` の狭義単調性で等名を弾きます。route は commit 時点で構造的に利用可能なため、提案スコープは実装可能です。

影響は Issue の記述どおり、あるいはそれ以上です。`tla-authoring.md:55-56` が「a registered set whose reachable behaviour changed **must** route to `revise-model`」と必須ルーティングを定めるため、ギャップは強制経路上にあります。同 `:149-151` は「the previous model map is left byte-for-byte intact」（loud fail-closed の裏付け）と「Do not hand-edit the model map to work around a refusal.」を明記しており、後者は本 Issue の「手動編集を誘発しうる」という懸念をステージ文書自身が先回りして禁じていることを示します。

ラベルは妥当です。現行挙動は承認済み FD 手順3 に準拠しており合意済み契約への違反ではないため `bug` ではなく、完了条件が replace-by-name という契約追加である以上、種別判定（4）により `enhancement` が正解です。`P2` も loud fail-closed かつ部分的代替経路が存在する点で整合します。

### 訂正・未解決事項

1. **完了条件5の精緻化を提案します。** `tests/unit/t448-tla-registration.test.ts:294` の「refuses a draft that duplicates a registered name」は route 非依存に拒否を pin しています。compose を route 依存化すればこのテストは author-new 側への再スコープが必須で、「既存テストのグリーン維持」だけでは済みません。完了条件を「t448 の同名拒否テストを author-new アームへ再スコープしたうえでグリーン維持」と書き換えることを推奨します。

2. **影響記述の限定。** 「改訂後の再登録が構造的に不能」は登録 committer 経路については正しい一方、既登録モデルの identity 更新は `updateModelMap`（フラグなし）が手動編集なしに実行できます。ただし同経路は `evidenceBundle` を既存値のまま carry across するだけで新しい bundle を書けません（新規 bundle の writer は登録経路のみ）。残余ギャップは正確には「**改訂モデルに新しい evidence bundle を監査ゲート経由で登録できない**」であり、より狭くかつ本質的です。本文の影響節をこの粒度へ精緻化することを推奨します。

3. 選挙 subagent-2 の留保「FR-010 が replace を規定するか否かを**ユーザー裁定事項として**本文に明記」は部分充足です。本文は FR-010 の不規定に触れますが、正準リスト(4)仕様変更としての明示はありません。実装着手前にこの裁定を先に取ることを推奨します。

4. `t448`/`t449` の prefix は無関係スイートと重複します（`t448-autonomy-statusline-segment`、`t449-pr-convergence-packaging-e2e`）。実装時はフルパス表記が安全です。

5. 重複 Issue の網羅探索は権限外のため未実施です。本 Issue が挙げる repo 内参照（record パス、選挙記録、FD、requirements）は全て実在を確認しました。

### 同根・対称面

**replace-by-name の in-place 更新イディオムはすでにリポジトリ内に存在します。** `amadeus-sensor-model-completeness.ts` の `canonicalRecord`（`:733-775`）は `map.models` を name で走査し `measured?.modelIdentity` で識別子を差し替えます。sensor 側は in-place、committer 側は append-only という非対称であり、実装は既存イディオムに倣えます。

副次的に、`AUTHORING_ROUTES` の同一定義が `tla-registration.ts:87` と `tla-applicability.ts:302` に重複しています。route 依存化の際は片方だけを直すと失敗が下流へ移動するため、両方の棚卸しが必要です。

### 後続検証者向けメモ

grep は全て `git grep -n -F` の単一固定文字列で実行し、選言と `\b` を回避しました（ローカル grep は ugrep ラッパのため両者は無音失敗します）。不在主張（削除操作の未実装）には既知実在リテラル `composeRegisteredMap`（2 hit）を対照に置いて grep の健全性を先に確認しています。対照群が無関係な理由で落ちた場合、それは対照として無効であり実験設計をやり直す必要がある点に注意してください。

### Verdict

**CONFIRMED** — 5件の CORE claim は全て一次資料と対照実験で裏付けられ、ギャップは強制ルーティング経路上に現存し、ラベル（enhancement / P2）も種別判定規則に整合します。上記「訂正・未解決事項」1〜3（完了条件5の書き換え、影響記述の evidence bundle 粒度への精緻化、FR-010 のユーザー裁定の先行取得）は実装着手前の本文更新として推奨しますが、いずれも Issue の実在性を否定するものではありません。

この verdict は Issue の実在性確認であり、実装着手・優先順位・クローズの承認ではありません。


### その他コメント(verbatim、任意)

#### j5ik2o — 2026-08-20T07:13:31Z — https://github.com/amadeus-dlc/amadeus/issues/2289#issuecomment-5352645471

## Cross-review convergence — ESTABLISHED_WITH_REFINEMENTS

- Issue: #2289 registration committer に revise-model の replace-by-name 登録を追加する
- Review run: `XR-260820-2289`
- Target SHA: `e86fbe125c85ddcbe7264f3a9a9a2377a06136da`
- Reviewer 1: `CONFIRMED_WITH_REFINEMENTS` / Reviewer 2: `CONFIRMED`
- Result: **`ESTABLISHED_WITH_REFINEMENTS`**（core claim に矛盾なし。両名が独立の実行再現・対照実験で同一欠落を確認）

### Confirmed（両名一致）

- `composeRegisteredMap` は route 非依存の無条件 append であり、同名既存エントリを持つ revise-model draft は構造的に commit 不能（両名が独立に実行再現、拒否逐語一致）
- FD 手順1a は両 route を受理し、出荷ステージ契約（`tla-authoring.md:55-56`）は revise-model への必須ルーティングを命じる — ギャップは強制経路上
- ギャップは現時点でも live（`composeRegisteredMap` 本体は PR #2287 からバイト同一）
- ラベル `enhancement` / `P2` は種別判定規則に整合

### Refinements（実装時に反映すべき申し送り）

1. **t448 の再スコープが必須**: `tests/unit/t448-tla-registration.test.ts:294-307` は route 非依存に同名拒否を pin。route 依存化では author-new アームへの再スコープ（または route 不在時の既定を append に保つ設計）が完了条件5の前提（両名一致）
2. **背景節の「無音成功なし」は同名 arm 限定へ訂正**（r1 F1）: route=revise-model + 不在名は現行 ok=true で map が書かれる（cross-check 構造的不在）。完了条件2は新設計制約ではなく現存 fail-open の是正
3. **影響の正確な粒度**（r2）: 残余ギャップは「改訂モデルに新しい evidence bundle を監査ゲート経由で登録できない」（識別子面は `updateModelMap` で既に更新可能）
4. FR-010 が replace 意味論を規定するか否かの裁定はユーザー専権事項として実装前に確定させる
5. `AUTHORING_ROUTES` の重複定義（`tla-registration.ts:87` / `tla-applicability.ts:302`）は route 依存化時に両方を棚卸し

### スピンオフ候補（本 Issue のスコープ外）

- r1 F4: `t448-tla-registration.test.ts:2-3` が同一 module specifier を import し `:74-82` が自己参照比較化（#2890 での無音退化、検証劇場クラス）— 別 Issue（bug）起票候補

No implementation, label change, closure, or work-selection decision was made.


## Issue #2929: enhancement(formal-model-check): model-map の IMPLEMENTATION_PATHS を plugin tools 境界へ拡張し、plugin 実装の drift 検知を可能にする

- state: OPEN / labels: 未取得(本 verb の read 面は本文・状態・コメントのみ) / url: https://github.com/amadeus-dlc/amadeus/issues/2929 / target-sha: e86fbe125c85ddcbe7264f3a9a9a2377a06136da
- review-run-id: XR-260820-2929 / 独立レビュアー: 2名(marker 計数)

### 本文(verbatim)

<!-- amadeus-issue-form:v1 type=enhancement -->

### 重複・現行状態の確認

- [x] open/closed の両方を対象に、同じ課題・提案・質問の Issue を検索しました（`gh issue list --state all --search "IMPLEMENTATION_PATHS"` — 0件）
- [x] origin/main と関連する open/merged PR を確認し、現行状態でも起票が必要だと確認しました（`plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts:236-239` の境界が現存）

### エレベーターピッチ

plugin 実装ファイルも形式モデルの governed entry として drift 検知したい
formal-model-check plugin を使い plugin 配下の実装を TLA+ で写像するチーム 向けの、
model-map の IMPLEMENTATION_PATHS 境界 というプロダクトは、
governed entry の実装パス許可リストです。
これは モデルが写像する実装の変更を ModelMapDrift で確実に失効検知させる ことができ、
現行の core/tools と formal-model-check plugin 自身に限定された2プレフィクス とは違って、
他 plugin(pr-convergence 等)の tools ディレクトリも正準境界として登録できる 拡張が備わっている。

### 背景・対象範囲

`entries[].implPath` は `IMPLEMENTATION_PATHS`(`amadeus-formal-verif-model-map.ts:236-239`)により `packages/framework/core/tools/amadeus-*.ts` と `plugins/formal-model-check/tools/<kebab>.ts` の2プレフィクスに限定されている。PrConvergenceGate モデル(intent 260811、PR #2911)の登録時、モデルが実際に写像する pr-convergence plugin の実装(`plugins/pr-convergence/tools/pr-convergence-{predicate,ledger,provenance}.ts` 等)を governed entry にできず、validator が拒否した。

### 根拠・実測証拠

登録時の実測(2026-08-12、branch feat/2838-pr-convergence-gate)。拒否の逐語:

```json
{"ok":false,"failure":{"kind":"validator-rejected","detail":"entries[2].implPath is outside the canonical implementation boundary"}}
```

結果、PrConvergenceGate は境界内の2ファイル(amadeus-orchestrate.ts / amadeus-state.ts — FR-5 のチョークポイント面)のみを entries に持ち登録済み。FR-2/FR-3/FR-4 が写像する pr-convergence plugin 実装の変更は ModelMapDrift に検知されない(登録は誠実だが被覆が spec より狭い)。

### 期待結果・完了条件

- `IMPLEMENTATION_PATHS` が他 plugin の tools 配下(少なくとも `plugins/<kebab>/tools/<kebab>.ts` 形)を正準境界として許容する、または plugin ごとの宣言的境界拡張機構を持つ。
- 境界拡張後、PrConvergenceGate の entries へ pr-convergence 実装ファイルを追加登録できる。
- 境界 validator の落ちる実証(境界外パスの拒否維持)を伴う。

### 影響・価値

plugin を写像する形式モデルの drift 検知が構造的に欠け、実装変更時にモデルが silently stale になる。plugin 化が進むほど影響面が広がる。

### 関連 Issue・PR・intent

- 実測: intent 260811-pr-convergence-gate の tla-authoring 登録(PR #2911 予定)/ registration-receipt.json(record)
- 関連: #2913(referee receipt — 登録前提の修正)

### 優先度（いつ対応するか）

P2 — 通常

### 代替案・非採用理由

- **案B: 登録時に境界を無断で広げる** — 非採用。model-map の境界は契約であり、変更は Issue と独立レビューを経るべき(登録 builder が STOP した判断を維持)。
- **案C: pr-convergence 実装を core/tools へ移設** — 非採用。plugin 境界の設計(harness-tools-placement 系)に逆行する。


### クロスレビューコメント(verbatim、コメント URL 併記)

#### j5ik2o — 2026-08-20T07:13:33Z — https://github.com/amadeus-dlc/amadeus/issues/2929#issuecomment-5352645654

## クロスレビュー（1人目・reviewer-1）: CONFIRMED_WITH_REFINEMENTS

<!-- issue-cross-review
review-run-id: XR-260820-2929
reviewer-id: reviewer-1
execution-subject-id: subj-sha256:edf3ca81acd1887c
target-sha: e86fbe125c85ddcbe7264f3a9a9a2377a06136da
-->

### 独立性と対象

本レビューは fresh context で実施し、本 Issue の既存コメントおよび他レビュアーの所見は参照していません。判断はすべて対象断面での実読・実行結果に基づきます。担当レンズは再現・現行コード機序・反証です。

- 対象 SHA: `e86fbe125c85ddcbe7264f3a9a9a2377a06136da`（`git rev-parse HEAD` で照合）
- 再現はリポジトリ外の scratch 環境で実施し、リポジトリおよび GitHub の状態は一切変更していません。

### Claim ledger

| # | 主張 | 中核 | 判定 |
|---|---|---|---|
| C1 | `IMPLEMENTATION_PATHS` が `entries[].implPath` を厳密に2プレフィクスへ限定 | ✅ | CONFIRMED（行番号は訂正あり） |
| C2 | plugin の implPath は逐語 `entries[N].implPath is outside the canonical implementation boundary` で拒否される | ✅ | CONFIRMED（再現済み） |
| C3 | PrConvergenceGate は境界内の core 2ファイルのみを pin し、pr-convergence plugin 実装を entries に持たない | ✅ | CONFIRMED |
| C4 | 非 governed な plugin 実装の変更は ModelMapDrift に検知されない | ✅ | CONFIRMED |
| C5 | 起票（2026-08-12）以降に境界は拡大していない | — | CONFIRMED |
| C6 | 完了条件「`IMPLEMENTATION_PATHS` の拡張」で目的（plugin 実装の drift 検知）を達成できる | — | **REFUTED（必要だが不十分）** |

### 再現・コード実読

**C1 — 境界の実在（行番号の訂正あり）**

Issue は `amadeus-formal-verif-model-map.ts:236-239` を挙げますが、対象断面での実在位置は `plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts:248-251` です（`:235-239` は現在 `ModelMapDrift` interface）。逐語:

```ts
const IMPLEMENTATION_PATHS: readonly [string, RegExp][] = [
  ["packages/framework/core/tools/", /^amadeus-[a-z0-9]+(?:-[a-z0-9]+)*\.ts$/],
  ["plugins/formal-model-check/tools/", /^[a-z0-9]+(?:-[a-z0-9]+)*\.ts$/],
];
```

適用は `isCanonicalImplementationPath`（同 `:330-336`）の `value.startsWith(prefix) && file.test(posix.basename(value))`、拒否の発行は `parseEntries`（同 `:348-352`）。行番号の移動を除き、主張の実体は無傷です。

**C2 — 拒否の再現（両側固定）**

実 `amadeus/spaces/default/specs/tla/model-map.json` を入力に、validator を scratch 環境へ複製して4条件を実行しました（control・許可プレフィクス・対象パス2種）。出力逐語:

```
CONTROL(real map):                                    {"ok":true,"error":null}
TREATMENT_A(plugins/github-pr-convergence/…):         {"ok":false,"detail":"entries[2].implPath is outside the canonical implementation boundary"}
TREATMENT_B(plugins/pr-convergence/… Issue 記載形):    {"ok":false,"detail":"entries[2].implPath is outside the canonical implementation boundary"}
TREATMENT_C(plugins/formal-model-check/… 許可形):      {"ok":true,"detail":null}
```

exit 0。Issue が引用する 2026-08-12 の拒否 JSON と、`entries[2]` という添字まで含めて逐語一致しました。control が通り許可プレフィクスも通ることから、拒否がパス境界のみに帰属することを両側で固定しています。

**C3 — model-map の実測**

`amadeus/spaces/default/specs/tla/model-map.json` の全 entries を集計（述語 = 全 `models[].entries[].implPath` の列挙、除外なし）:

```
total entries: 13 / distinct implPaths: 11 / models: 4
under packages/framework/core/tools/: 13
under plugins/:                        0
```

PrConvergenceGate の entries は `packages/framework/core/tools/amadeus-orchestrate.ts` と `…/amadeus-state.ts` の2件のみで、Issue の記述どおりです。あわせて、validator が許可している2つ目のプレフィクスを使う entry は**全モデルを通じて 0 件**です（この事実は下の C6 に効きます）。

**C4 — 機序**

`diffModelMap`（同ファイル `:668-679`）は `model.entries.flatMap(...)` で **entries に載っている implPath だけ**を走査します。比較対象の `currentEntries` も `registeredEntries`（`plugins/formal-model-check/tools/amadeus-sensor-model-completeness.ts:233-240`）が map の entries から構築します。したがって entries に無いファイルは recorded 側・current 側の双方に現れず、drift の観測面に構造的に存在しません。「登録は誠実だが被覆が spec より狭い」という Issue の表現は正確です。

回避路の不在も確認しました。core/tools への symlink で plugin 実装を pin する迂回は、ローダーが `linkStat.isSymbolicLink()` を明示的に drift として拒否するため成立しません。

**C5 — 現行性**

`IMPLEMENTATION_PATHS` ブロックの最終変更は `387cbd014`（2026-08-11、#2890）で、起票（2026-08-12）**より前**です。起票以降に当該ファイルへ着地したのは `e461fea3c`（#3263、authoring provenance の要求追加）のみで、境界定義には触れていません。境界は現存し、Issue は現行状態でも有効です。

### 機序・影響・ラベル

**完了条件の不足（C6 = REFUTED）— 本レビュー最大の指摘**

Issue は境界の choke point を `IMPLEMENTATION_PATHS` 1箇所として記述していますが、**独立した第二の、より狭い境界**が存在します。`plugins/formal-model-check/tools/tla-model-loader-internal.ts:291` 逐語:

```ts
const implementationRoot = resolve(repositoryRoot, "packages", "framework", "core", "tools");
```

この `implementationRoot` に対し、全モデルの全 entries が `isContained` を要求されます（同 `:298-300`、違反時は逐語 `implementation entry is not a regular in-boundary file` で SOURCE_DRIFT）。この定数はハードコードで、plugin プレフィクスを一切含みません。述語を逐語抽出して実パスで評価した結果:

```
IN-BOUNDARY     packages/framework/core/tools/amadeus-orchestrate.ts
OUT-OF-BOUNDARY plugins/formal-model-check/tools/amadeus-sensor-model-completeness.ts
OUT-OF-BOUNDARY plugins/github-pr-convergence/tools/pr-convergence-predicate.ts
```

帰結は2つです。

1. **完了条件は必要だが不十分**。`IMPLEMENTATION_PATHS` だけを広げると、map は parse を通過するがロード時に SOURCE_DRIFT で落ちます。実装は両境界の同時拡張を要します。完了条件に第二 choke point の是正を追加すべきです。
2. **潜在的な不整合が現存**。validator は `plugins/formal-model-check/tools/` を許可する一方、ローダーはこれを境界外として拒否します。両者は今日すでに食い違っており、`plugins/` 配下の entry が 0 件であるために顕在化していないだけです。これは project.md の `cid:code-generation:cg2-agreeing-predicate-drift`（同一の合意述語が複数箇所へ複製されドリフトする形）に該当します。

**落ちる実証の現況（完了条件3への申し送り）**

validator 側の境界拒否には既存テストがあります（`tests/unit/t-formal-verif-canonical-core.test.ts:96` — `rejects an implPath outside the canonical implementation boundary`）。一方、ローダー側の第二境界には**テストが存在しません**。`git grep -n -F "is not a regular in-boundary file" -- tests/` は 0 hit・exit 1（不一致であってエラーではない）、`verifyImplementationEntries` を参照するテストも 0 hit・exit 1。述語の健全性は、実在既知の対照リテラル `canonical implementation boundary` を同じ対象集合へ適用して 1 hit を得ることで確認済みです。完了条件が要求する落ちる実証は、**両境界について**求めるのが妥当です。

**隣接する非対称（参考、本 Issue の判定は変えません）**

完全性センサーの発火グロブ（`plugins/formal-model-check/sensors/amadeus-model-completeness.md:8`）は spec 配下と `amadeus-election*.ts` / `amadeus-mirror-*.ts` のみを対象とし、PrConvergenceGate が実際に pin している `amadeus-orchestrate.ts` / `amadeus-state.ts` を含みません。ただし当該センサーは `default_severity: advisory` であり、governed entry に対するブロッキングな強制はモデル検査ロード時の SOURCE_DRIFT が担っています。境界拡張の設計時には、この発火面の整合も併せて検討する価値があります。

**影響**

Issue の影響記述に同意します。追加の観測として、現在 validator が許可する2プレフィクスのうち**実際に使用可能なのは 1 つだけ**であり、実効的な境界は「core/tools 単独」です。formal-model-check plugin 自身の実装すら governed entry にできません。plugin 化が進むほど被覆ギャップが広がるという評価は妥当です。

**ラベル**

`enhancement` + `P2` を支持します。境界は設計意図どおり動作しており既存の合意済み契約に違反していないため bug ではなく、要求は契約の意図的な拡張です（team.md の完了条件判定 (4)）。現時点で誤った成果物を生んでいない被覆ギャップであり、P2 が妥当です。

なお上記の「validator と loader の境界不一致」は、それ自体は契約違反の形をとるため、**別 Issue（bug）としてのスピンオフが妥当**と考えます。本 Issue の再分類は提案しません。

### 訂正・未解決事項

**訂正 1（行番号）**: `amadeus-formal-verif-model-map.ts:236-239` → 対象断面では `:248-251`。

**訂正 2（plugin 名）**: Issue が挙げる `plugins/pr-convergence/tools/pr-convergence-{predicate,ledger,provenance}.ts` は対象断面に存在しません。`a4196f191`（PR #3051、2026-08-14 — 起票の2日後）で `plugins/github-pr-convergence/` へ改名済みで、3ファイルはいずれも改名後ディレクトリに実在します。主張の実体は無傷ですが、実装時のパス指定は改名後の形を使う必要があります。なお改名後のパスも改名前のパスも、境界拒否の挙動は同一です（上記 TREATMENT_A / B）。

**未解決 1**: 第二境界の是正方式（`implementationRoot` を可変化するか、`IMPLEMENTATION_PATHS` から導出して1定義へ集約するか）は本レビューの範囲外です。ただし2箇所の手書き複製を残す形は避けるべきです。

**未解決 2**: 境界拡張の粒度（Issue が挙げる `plugins/<kebab>/tools/<kebab>.ts` の一般形か、宣言的な plugin 単位の opt-in か）は設計判断であり、本レビューでは判定していません。一般形はセルフインストール投影面（`.claude/plugins/...`）を許容しうる点の検討が必要です。

**未解決 3**: 完了条件2「PrConvergenceGate の entries へ pr-convergence 実装ファイルを追加登録できる」については、どのファイルが FR-2/FR-3/FR-4 の写像対象かを対象断面で再確定する必要があります（起票時の判断は改名前の断面に基づくため）。本レビューでは再確定していません。

### 同根・対称面

- **#3186**（OPEN, `enhancement`/`P2`）— 同じ症状族（PrConvergenceGate がモデルとして無音で stale 化する）を別機序（tla-authoring 適用性判定の語彙 drift 検出欠落）から扱います。同 Issue は本文の重複確認節で本 Issue を「期待結果 2 と正面重複するため関連 Issue へ追加した」と自ら記載しており、相互参照は既に成立しています。重複ではなく重畳と判定します。実装順序としては、本 Issue（governed entry の被覆拡大）が #3186 の前提部品になりうる関係です。
- **対称面**: validator / loader の境界二重定義（上記）。同一リポジトリ内の対称ケースとして `plugins/formal-model-check/tools/run-model-check-artifacts.ts:129` にも別の `isContained` 定義が存在します（用途は別ですが、同名述語の三重定義にあたります）。
- 重複検索: `IMPLEMENTATION_PATHS` および `model-map implPath boundary` の2述語（state=all）で、返るのは #2929 と #3186 のみ。他に重複はありません。

### 後続検証者向けメモ

- 行番号は起票時から移動しています。位置ではなく識別子（`IMPLEMENTATION_PATHS`、`isCanonicalImplementationPath`、`verifyImplementationEntries`）で再解決してください。
- 再現には validator 単体を scratch へ複製し、実 model-map.json を読み込んで entries に1件追加する形が最短です。`parseTlaModelMap` はファイル実在を検査しないため sha256 はダミーで足り、entries の昇順制約だけ守れば追加位置は末尾で通ります。control（無改変）と許可プレフィクスの2条件を必ず併走させてください。片側だけでは拒否がパス境界に帰属することを示せません。
- 本ワークスペースの `grep` は ugrep ラッパで、長い選言や `\b` を含む述語が一致0件・exit 1 で無音終了します。全数棚卸しには `git grep -n -F` を使い、0 hit を不在の根拠にする前に**実在が既知の対照リテラル**を同じ述語形・同じ対象集合で走らせて健全性を確認してください（本レビューでは `canonical implementation boundary` を対照に使用）。
- シェルは zsh でクォートなし変数展開が語分割されません。ファイル集合の走査は配列で回してください。
- 第二境界（ローダー側）の end-to-end 再現には、`.git` + `package.json` を備えた擬似リポジトリと model/cfg 資産一式の構築が要ります。本レビューは述語の逐語抽出による評価に留めており、ローダー全経路の e2e 再現は**未実施**です。この面を確約級に固める場合は `loadVerifiedTlaSourcesInternal`（`tla-model-loader-internal.ts:464`）が `TlaFileSystem` を注入可能である点を利用してください。

### Verdict

**CONFIRMED_WITH_REFINEMENTS**

Issue の中核主張（C1〜C5）はいずれも対象断面で成立し、拒否は逐語まで再現しました。機序の記述も正確です。refinement は3点です。(1) 行番号と plugin 名の訂正、(2) 完了条件が不十分 — `IMPLEMENTATION_PATHS` の拡張だけでは目的を達成できず、ローダー側の第二境界の同時是正が必要、(3) 落ちる実証は両境界について求めるべきで、現在ローダー側の境界にはテストが存在しない。

この verdict は Issue の実在性確認であり、実装着手・優先順位・クローズの承認ではありません。


#### j5ik2o — 2026-08-20T07:13:34Z — https://github.com/amadeus-dlc/amadeus/issues/2929#issuecomment-5352645840

## クロスレビュー（2人目・reviewer-2）: CONFIRMED（訂正・補完付き）

<!-- issue-cross-review
review-run-id: XR-260820-2929
reviewer-id: reviewer-2
execution-subject-id: subj-sha256:2a8c88d5efb37d57
target-sha: e86fbe125c85ddcbe7264f3a9a9a2377a06136da
-->

### 独立性と対象

fresh context で実施し、もう一人のレビュアーの成果物および本 Issue の既存コメントは参照していません。根拠は凍結 SHA `e86fbe125c85ddcbe7264f3a9a9a2377a06136da`（`git rev-parse HEAD` で一致確認）における実読とコマンド出力のみです。二次レンズは claim completeness / 由来・履歴 / 影響 / ラベル / 同根・対称面です。リポジトリは無変更、GitHub 状態も無変更、scratch は repo 外に置きました。

### Claim ledger

| # | 主張 | core | 判定 |
|---|---|:---:|---|
| 1 | `entries[].implPath` は `IMPLEMENTATION_PATHS` により core/tools と formal-model-check plugin の2プレフィクスに限定 | ✔ | CONFIRMED（行番号のみ訂正） |
| 2 | 拒否の逐語 `entries[N].implPath is outside the canonical implementation boundary` | ✔ | CONFIRMED（独立に再現） |
| 3 | PrConvergenceGate は境界内の core 2ファイルのみを entries に持つ | ✔ | CONFIRMED |
| 4 | FR-2/FR-3/FR-4 が写像する plugin 実装の変更が drift 検知されない | ✔ | CONFIRMED |
| 5 | 完了条件（validator 拡張＋登録可能化＋落ちる実証） | ✔ | **INCOMPLETE** — 影響面が2つ欠落 |
| 6 | 引用パス `plugins/pr-convergence/tools/...` | – | **STALE** — rename 済み |
| 7 | ラベル `enhancement` / `P2` | – | 妥当（別 bug の分離起票を推奨） |

### 再現・コード実読

**境界定数**（`plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts:248-251`。Issue の `:236-239` から行ドリフト、内容は同一）:

```ts
const IMPLEMENTATION_PATHS: readonly [string, RegExp][] = [
  ["packages/framework/core/tools/", /^amadeus-[a-z0-9]+(?:-[a-z0-9]+)*\.ts$/],
  ["plugins/formal-model-check/tools/", /^[a-z0-9]+(?:-[a-z0-9]+)*\.ts$/],
];
```

`:333` の `isCanonicalImplementationPath` が唯一の消費点、`:348-351` の `parseEntries` が拒否を返します。`git grep -n -F "IMPLEMENTATION_PATHS"` の全リポジトリ走査でヒットは2行のみ（定義と消費）。定数は module-private です。

**静的再現**（repo 外 scratch から実パーサを import、対照ケース付き）:

```
A) parse plugins/formal-model-check/tools/tla-applicability.ts             ok=true
A) parse plugins/github-pr-convergence/tools/pr-convergence-predicate.ts
   ok=false detail=entries[0].implPath is outside the canonical implementation boundary
A) parse packages/framework/core/tools/amadeus-state.ts（対照）            ok=true
```

2行目が Issue の逐語と完全一致します。Claim 2 は独立に確認できました。

**model-map 実測**（`amadeus/spaces/default/specs/tla/model-map.json`、`schemaVersion: 2`）: 全4モデル・全13エントリが `packages/framework/core/tools/` 配下です。PrConvergenceGate の entries はちょうど `amadeus-orchestrate.ts` と `amadeus-state.ts` の2件で、Claim 3 と一致します。`plugins/formal-model-check/tools/` プレフィクスを使うエントリは**現時点で0件**です。

**FR 被覆**（`260811-pr-convergence-gate/construction/tla-authoring/`）: `governed-subjects.json` の subjects は `FR-2, FR-3, FR-4, FR-5`、`trace-rows.json` では FR-2/3/4 が `EvidenceCurrentHead` / `SensorRequiresAttestation`（report lifecycle・attestation・sensor 面）へ、FR-5 が `CodeGenerationGuarded` / `WorkflowGuarded`（engine チョークポイント面）へ写像されています。前者の実装は plugin 配下、後者は core 配下なので、Claim 4 の構造は整合します。`registration-receipt.json` の `registeredAt` は `2026-08-12T06:29:01.172Z` で、Issue 起票（`06:33:37Z`）の約4分半前です。

### 機序・影響・ラベル

**由来（履歴）**: `git log -S "IMPLEMENTATION_PATHS" --all`（remote ref 188件を含む）でヒットするコミットは `387cbd014`（2026-08-11、PR #2890）**ただ1つ**です。それ以前は単一の `IMPLEMENTATION_PREFIX = "packages/framework/core/tools/"` で、#2890 がタプルリスト化と同時に自プラグインのプレフィクスを追加しました。**他 plugin のプレフィクスは一度も含まれたことがありません。** 同時に、境界の拡張は「タプルを1件追加する」という既に前例のある形であることも分かります。

**完了条件の欠落（本レビューの主要指摘）**: Issue は `IMPLEMENTATION_PATHS` のみを名指しますが、実際には**より狭い第2の境界**がローダー側にあります。

`plugins/formal-model-check/tools/tla-model-loader-internal.ts:291`:

```ts
const implementationRoot = resolve(repositoryRoot, "packages", "framework", "core", "tools");
```

`:299-301`:

```ts
if (linkStat.isSymbolicLink() || !fs.stat(realPath).isFile() || !isContained(implementationRoot, realPath)) {
  return drift(entry.implPath, "implementation entry is not a regular in-boundary file");
}
```

この関数 `verifyImplementationEntries` は `:498` の `loadVerifiedTlaSourcesInternal`（exported）から呼ばれる live path です。`:141-147` の `isContained` を逐語コピーして評価した結果:

```
B) isContained(core/tools, plugins/formal-model-check/tools/tla-applicability.ts)      = false
B) isContained(core/tools, plugins/github-pr-convergence/tools/pr-convergence-predicate.ts) = false
B) isContained(core/tools, packages/framework/core/tools/amadeus-state.ts)（対照）      = true
```

したがって **`IMPLEMENTATION_PATHS` だけを広げても目的は達成できません**。plugin パスのエントリは parse を通過したのち、ローダーで `SOURCE_DRIFT` として弾かれます。

**付随して判明した既存の不整合**: 上記の結果、#2890 が `IMPLEMENTATION_PATHS` へ追加した `plugins/formal-model-check/tools/` プレフィクスは、ローダー側が対応していないため**現状でも使用不能**です。この定数の最終変更は `9458bbda8`（2026-08-04）で #2890 より前であり、2026-08-11 以降 validator とローダーの2つの述語が食い違ったまま main に残っています。現在このプレフィクスを使うエントリが0件のため休眠しているだけです。同一意味の述語が複数箇所へ手書き複製されている面であり、`cid:code-generation:cg2-agreeing-predicate-drift` の典型例です。**これは本 Issue が求める拡張とは別個の欠陥**なので、`bug` として分離起票することを提案します（本 Issue のラベル変更は不要）。

**第3の欠落面**: `plugins/formal-model-check/sensors/amadeus-model-completeness.md:8` の発火 glob も手書き allowlist です。

```
matches: "**/{amadeus/spaces/*/specs/tla/**,packages/framework/core/tools/amadeus-election*.ts,packages/framework/core/tools/amadeus-mirror-*.ts}"
```

`plugins/` 配下を一切含まないため、境界拡張後も plugin 実装の編集ではセンサーが自動発火しません。加えてこの glob は `amadeus-orchestrate.ts` / `amadeus-state.ts` も含まないので、**現行4モデル中2モデルの entries について既に自動発火していません**（この manifest も #2890 が最後に変更しています）。

まとめると、完了条件は最低3面を明示すべきです。(1) `IMPLEMENTATION_PATHS`（validator） (2) `implementationRoot`（ローダーの containment、SOURCE_DRIFT 経路） (3) sensor manifest の `matches` glob。

**落ちる実証の実現可能性**: 境界を pin するテストは `tests/unit/t-formal-verif-canonical-core.test.ts:96` の1件のみで、境界外ケースに `scripts/amadeus-election.ts` を使っています。提案されている `plugins/<kebab>/tools/<kebab>.ts` 形へ拡張しても、このパスは境界外のままなので既存テストは反転しません。落ちる実証は同テストの拡張で無理なく成立します。

### 訂正・未解決事項

- **訂正1（パス）**: Issue が引く `plugins/pr-convergence/` は凍結 SHA に存在せず（`ls` exit 2）、`plugins/github-pr-convergence/` へ rename されています。名指しの `pr-convergence-{predicate,ledger,provenance}.ts` は新パス配下に実在するため、主張の実体は維持されます。
- **訂正2（行番号）**: `:236-239` → `:248-251`。内容は同一です。
- **未解決1（証拠の再導出性）**: 引用された拒否 JSON は `amadeus/` 配下のどこにも記録されていません（`git grep -F` exit 1。同ツリーへの対照 grep はヒットするため探索経路は健全）。ただし本レビューの独立再現が同一メッセージを出したため、主張の真偽自体は確認済みです。今後は拒否の一次証跡を record へ残すことを推奨します。
- **未解決2（currentness の射程）**: remote ref 188件の範囲では境界を広げたコミットは存在しませんが、GitHub へは問い合わせていないため、未 fetch の open PR が既に広げている可能性は排除できません。

### 同根・対称面

- **BoltPrAttestationGate に同一の欠落**（Issue 未言及）。同モデルの `namedInvariants` は PrConvergenceGate の5個すべてを含む11個の上位集合で、`attested` / `sensorPassed` / `reportHead` を写像しています（`amadeus/spaces/default/specs/tla/BoltPrAttestationGate.tla:51-57`）。これらの実装は `plugins/github-pr-convergence/tools/pr-convergence-attestation.ts`（251行）や `amadeus-sensor-pr-convergence-report-format.ts`（586行）にありますが、同モデルもまた core 2ファイルしか pin していません。**Issue の指摘は PrConvergenceGate 単独ではなく、PR 系2モデルに共通します。**
- 残る2モデル（FormalElection 5件、MirrorLifecycle 4件）は実装が全面的に core/tools にあるため、この境界問題の影響を受けません。影響範囲は4モデル中2モデルです。
- 対称面として、`plugins/formal-model-check/tools/` プレフィクスが「validator は許可するがローダーは拒否する」休眠状態にあることは前述のとおりです。

### 後続検証者向けメモ

- ローカルの `grep` は ugrep ラッパで、長い選言や `\b` を含む述語が無音で exit 1 になります。全数走査は `git grep -n -F` を使ってください。パイプの `$?` は最終段のものになるため、exit code を根拠にする際はリダイレクトして単独で採取してください（本レビューは実在既知の対照リテラルを添えて 0-hit の健全性を確認しています）。
- 境界の検証は parse 面だけでは不足します。`amadeus-formal-verif-model-map.ts`（parse 境界）と `tla-model-loader-internal.ts`（containment 境界）と sensor manifest の `matches`（発火境界）の**3面を必ず併せて**確認してください。
- `git log -S` に `--follow` を併用すると本ファイルでは導入コミットを取り逃します。`--all` かつパス glob（`-- '*model-map*'`）での採取を推奨します。

### Verdict

**CONFIRMED（訂正・補完付き）** — 中核主張はすべて凍結 SHA で静的再現できました。ただし完了条件は不完全であり、`implementationRoot`（ローダー containment）と sensor manifest の `matches` の2面を追加しない限り目的は達成できません。あわせて、validator とローダーの述語不整合を別 `bug` として分離起票し、BoltPrAttestationGate も対象に含めるようスコープを明示することを提案します。

この verdict は Issue の実在性確認であり、実装着手・優先順位・クローズの承認ではありません。


### その他コメント(verbatim、任意)

#### j5ik2o — 2026-08-20T07:13:35Z — https://github.com/amadeus-dlc/amadeus/issues/2929#issuecomment-5352646050

## Cross-review convergence — ESTABLISHED_WITH_REFINEMENTS

- Issue: #2929 model-map の IMPLEMENTATION_PATHS を plugin tools 境界へ拡張し、plugin 実装の drift 検知を可能にする
- Review run: `XR-260820-2929`
- Target SHA: `e86fbe125c85ddcbe7264f3a9a9a2377a06136da`
- Reviewer 1: `CONFIRMED_WITH_REFINEMENTS` / Reviewer 2: `CONFIRMED`（訂正・補完付き）
- Result: **`ESTABLISHED_WITH_REFINEMENTS`**（core claim に矛盾なし。両名が独立に同一の重大な補完 — 第二境界 — を発見して収束）

### Confirmed（両名一致）

- `IMPLEMENTATION_PATHS`（現行 `:248-251`、Issue 記載 `:236-239` から行ドリフト）は 2 プレフィクス限定で、plugin implPath は逐語 `entries[N].implPath is outside the canonical implementation boundary` で拒否（両名が独立再現、うち r1 は添字まで一致）
- model-map 全 4 モデル・全 13 エントリが core/tools 配下。PrConvergenceGate は core 2 ファイルのみ pin、FR-2/3/4 の実装面（plugin 配下）は drift 観測面に構造的に不在
- 境界は起票以降拡大しておらず Issue は現行有効。ラベル `enhancement` / `P2` は妥当

### Refinements（完了条件の改訂が必須 — 両名の独立発見が一致）

1. **完了条件は 3 面へ拡張すること**: `IMPLEMENTATION_PATHS`（validator）だけでは不十分。(a) `tla-model-loader-internal.ts:291` の `implementationRoot`（ローダー containment、違反は SOURCE_DRIFT）が独立の第二境界として存在し、これを同時に是正しない限り plugin エントリはロード時に落ちる。(b) sensor manifest `amadeus-model-completeness.md:8` の `matches` glob も plugins/ を含まない第三の面（現行 4 モデル中 2 モデルの entries は既に自動発火対象外）
2. **パス訂正**: `plugins/pr-convergence/` → `plugins/github-pr-convergence/` へ rename 済み（PR #3051）。実装時は改名後パスを使用
3. **落ちる実証は両境界について**: ローダー側境界にはテスト不在（`git grep -F "is not a regular in-boundary file" -- tests/` → 0 hit）
4. **対象拡大**: BoltPrAttestationGate も同一欠落（plugin 実装を pin できない）— PR 系 2 モデルを対象に含めるようスコープ明示（r2）
5. 同名述語の三重定義（validator / loader / `run-model-check-artifacts.ts:129` の isContained）— 1 定義への集約を推奨

### スピンオフ候補（本 Issue のスコープ外・別 bug 起票が妥当 — 両名一致）

- #2890 が validator へ追加した `plugins/formal-model-check/tools/` プレフィクスはローダー未対応のため**現状でも使用不能**（validator/loader の述語不整合、2026-08-11 から休眠中の契約違反）

No implementation, label change, closure, or work-selection decision was made.


## Issue #3187: question(formal-model-check): authoring-subjects.json の space 宣言第一号を投入するか、advisory authoring-hold を退役するかの裁定

- state: OPEN / labels: 未取得(本 verb の read 面は本文・状態・コメントのみ) / url: https://github.com/amadeus-dlc/amadeus/issues/3187 / target-sha: 127be70c5d7a584016f88a5d44e8715904020721
- review-run-id: xrev-3187-20260818 / 独立レビュアー: 2名(marker 計数)

### 本文(verbatim)

### 重複・現行状態の確認

- [x] open/closed の両方を対象に検索しました（`gh issue list --state all --search` を `authoring-subjects` / `authoring-hold` で実行。#2766〈CLOSED — 同症状の初報。grid 経由の実行接続は PR #2779/#2890 で解消済み〉、#2823/#2267〈consumer ワークスペースへの advisory 投影問題で別クラス〉。**本 Issue は #2766 修正後も advisory 経路側が初報時の状態のまま残っている**という新規の実測であり重複ではない）
- [x] origin/main と関連 PR を確認し、現行状態でも起票が必要だと確認しました（観測 ref = origin/main `23d4ae767`。下記のとおり subjects ファイル不在・書き手不在は現行 head の実測）

### 背景・対象範囲

formal-model-check プラグインは 2 経路で tla-authoring を起動する設計になっている: (1) scope-binding による stage grid 経由(実効経路 — 260811 以降 25/25 実行を実測、独立 2 名調査 run tla-reinvest-20260818)と、(2) plugin.json の `advisories[]` に宣言された **authoring-hold**(checkpoints: requirements-analysis / functional-design / build-and-test → handoff: tla-authoring)。本 Issue は (2) が**構造的に一度も発火できない**ことを報告する。

対象範囲: `plugins/formal-model-check/tools/tla-authoring.ts` の advisory 経路、governed subjects 宣言(`amadeus/spaces/default/specs/authoring-subjects.json`)の書き手、plugin.json の advisory 宣言。

### 根拠・実測証拠

- **宣言ファイルが存在しない**: `git ls-tree origin/main amadeus/spaces/default/specs/authoring-subjects.json` → 0 行・exit 1。ローカル作業ツリーにも不在。`git check-ignore` は exit 1(gitignore 由来の不在ではない)
- **書き手が本番コードに存在しない**: `git grep -n -F "authoring-subjects.json" origin/main -- plugins/ packages/` → **唯一のヒットは `plugins/formal-model-check/tools/tla-authoring.ts:521`**(path 解決関数 `defaultSubjectsPath`)。同ファイルの使用箇所は `advisoryHold` の `readFileSync` のみで、write 系呼び出しは 0 件。テスト `tests/integration/t528-authoring-hold-end-to-end.integration.test.ts` は fixture としてファイルを植えるため hold 自体は発火可能(機構は生きている)が、本番ワークフローでこのファイルを書く工程が存在しない
- **実行結果**: `bun plugins/formal-model-check/tools/tla-authoring.ts advisory hold` → `{"ok":true,"verdict":{"kind":"no-hold"},"reason":"no governed subjects are declared"}`(調査 A の実測)。`advisoryHold` は ENOENT を「統治対象なし」の正当な no-hold として扱う設計(tla-authoring.ts:565-597 付近、コメント逐語 "Only true absence is \"nothing is governed here\"")のため、ファイルが永久に不在なら advisory は永久に no-hold
- **帰結の実測**: 唯一の author-new 実行(260811-pr-convergence-gate、governed-subjects.json を record 内に保持)およびモデル登録(registration-receipt)後も、space レベルの `authoring-subjects.json` は生成されていない。#2766 の本文が記した症状「全 intent の 3 checkpoint で判定が常に no-hold」は、advisory 経路については**現在も同じ出力**である

事実と解釈の区別: ファイル不在・書き手不在・no-hold 出力は事実。「登録工程が subjects を宣言へ昇格させるべきだった」は設計解釈であり、正しい書き手の所在(authoring 登録時か、functional-design 時か)は本 Issue の裁定事項。

### 期待結果・完了条件

1. governed subjects 宣言の**書き手の所在を裁定**する(候補: author-new/revise-model の登録完了時に subjects を昇格書込 / 設計ステージで宣言 / advisory 経路自体を退役して plugin.json から宣言を撤去)。「経路を活かす」か「退役して宣言を消す」かのどちらでもよいが、**宣言と実態の乖離(発火し得ない advisory の宣言)を残さない**こと
2. 活かす場合: 実ワークフローで checkpoints のいずれかが hold を返す落ちる実証(fixture でなく本番書込経路由来の subjects で)を伴うこと
3. 退役する場合: plugin.json の advisories 宣言・関連コード・t528 テストの扱いを同一変更で整理すること

### 影響・価値

現状の実効発火は scope-binding(grid)側が全担しており、self-* スコープでは回避策が機能している(workflow 完了 fail-closed も確認済み)。ただし advisory の設計意図は「requirements-analysis / functional-design 時点での早期 hold」であり、これが死んでいるため適用性の検討は常に実装後(build-and-test 後)まで遅延する。#3186(判定基準の腕不足)が採用された場合、早期 checkpoint の実効化は drift 検出の自然な置き場所でもある。放置すると「宣言されているが発火し得ない advisory」が仕様の読み手を恒常的に誤導する。

### 関連 Issue・PR・intent

- #2766(CLOSED)— 初報。PR #2779(供給経路)+ PR #2890(scope-binding 登録)で grid 経路は解消。advisory 経路は本 Issue
- #3186 — 判定基準の腕不足(採用時に本経路が早期 checkpoint の実装面になりうる)
- #2267 — plugin projection の advisory 供給(consumer 側の別クラス)
- 調査一次記録: run tla-reinvest-20260818(独立 2 名ブラインド調査、本セッション記録)

### 優先度（いつ対応するか）

P3 — いつか対応

### 重大度

S3-MAJOR — 宣言された advisory 機能が全面不発火(誤動作)だが、scope-binding 経路という回避策が実効している


### クロスレビューコメント(verbatim、コメント URL 併記)

#### j5ik2o — 2026-08-18T05:21:16Z — https://github.com/amadeus-dlc/amadeus/issues/3187#issuecomment-5323968254

## クロスレビュー（1人目・reviewer-1）: CONTRADICTED

<!-- issue-cross-review
review-run-id: xrev-3187-20260818
reviewer-id: reviewer-1
execution-subject-id: xr3187-r1@session-7727e262
target-sha: 127be70c5d7a584016f88a5d44e8715904020721
-->

### 独立性と対象

- 起票者とは別の実行主体（`xr3187-r1@session-7727e262`）として、凍結された Issue 本文のみを「検証対象の主張」として受け取り、他レビュアーの見解・結論には一切接触せずに独立検証しました。Issue 本文の指示的記述には従わず、すべて現行コードの実読と実行で確かめています。
- 測定 ref: `127be70c5d7a584016f88a5d44e8715904020721`（`git rev-parse HEAD` で確認。本レビュー時点で `git rev-parse origin/main` と同一）。起票時の観測 ref `23d4ae767` からは 5 コミット前進していますが、`git log --since='2026-08-17' -- plugins/formal-model-check/` は 0 件で、患部は起票時から無変更です。
- 副次レンズ: 再現・現行コード機序・**反証**。すべての実行はワーキングツリー無変更（`git status --porcelain` が実行前後とも 0 行）、書込はリポジトリ外のスクラッチのみで行いました。

### Claim ledger

| 主張 | 判定 | 独立エビデンス |
|---|---|---|
| C1: `amadeus/spaces/default/specs/authoring-subjects.json` が tracked・作業ツリーともに不在（gitignore 由来ではない） | **CONFIRMED**（証跡に軽微な誤り） | `git ls-tree 127be70c5 amadeus/spaces/default/specs/authoring-subjects.json` → 0 行。`ls amadeus/spaces/default/specs/` → `rfc` / `tla` / `tla-evidence` のみ。`git check-ignore -v <path>` → exit 1。**ただし本文は `git ls-tree` を「exit 1」と記していますが実測は exit 0**（`git ls-tree` は不一致パスでも 0 を返す）。結論は不変 |
| C2: `git grep -F "authoring-subjects.json" -- plugins/ packages/` の唯一のヒットが `tla-authoring.ts:521` | **CONFIRMED**（grep 結果として） | 同一述語を再実行 → 1 行（`:521` の `defaultSubjectsPath`）、exit 0 |
| C3: 「同ファイルの使用箇所は `advisoryHold` の `readFileSync` のみで、**write 系呼び出しは 0 件**」 | **CONTRADICTED** | `plugins/formal-model-check/tools/tla-authoring.ts:658-659` — `const path = flags.out ?? defaultSubjectsPath();` → `publishSubjects(path, governed)`。`publishSubjects`（`:623-638`）は `writeFileSync` + `renameSync` の atomic publish |
| C4: **「`authoring-subjects.json` の書き手が本番コードに存在しない」（Issue 表題の中核主張）** | **CONTRADICTED** | `subjectsDeclare`（`plugins/formal-model-check/tools/tla-authoring.ts:640-661`）。直前 `:601` のコメント逐語 `The sole writer of the governed-subjects declaration (D1 of #2766).`。USAGE `:80-81` に `subjects declare --document <path> --kind <requirements\|decisions> --id <stable-id> [--out <path>]` |
| C5: 書き手が本番ワークフローに配線されていない | **CONTRADICTED** | `plugins/formal-model-check/stages/tla-authoring.md:53` 逐語 ``4. For a non-empty selected set, run `subjects declare`, then`` 。`tests/integration/t450-tla-authoring-stage-e2e.integration.test.ts:172` が `expect(receiving).toContain("subjects declare")` で blocking 固定 |
| C6: **advisory 経路が「構造的に一度も発火できない」** | **CONTRADICTED** | 本番書き手のみで hold を実測（下記「再現・コード実読」F1→F3）。fixture 手植えは不使用 |
| C7: `advisory hold`（無引数）→ `{"ok":true,"verdict":{"kind":"no-hold"},"reason":"no governed subjects are declared"}` | **CONFIRMED** | `bun plugins/formal-model-check/tools/tla-authoring.ts advisory hold` → 逐語一致、exit 0 |
| C8: `advisoryHold` は ENOENT のみを正当な no-hold として扱う（コメント逐語あり） | **CONFIRMED**（行域を訂正） | `:565-599`（本文は `:565-597`）。`:567` 逐語 `// Only true absence is "nothing is governed here" (the ruled no-hold case).`、`:574-575` が ENOENT 分岐 |
| C9: plugin.json が `authoring-hold` を 3 checkpoint へ宣言、handoff は `tla-authoring` | **CONFIRMED** | `plugins/formal-model-check/plugin.json:76-94`。evaluator argv は `["bun","tools/tla-authoring.ts","advisory","hold"]` で `--subjects-file` を渡さない（＝空間レベル既定パスを読む） |
| C10: 「t528 は **fixture としてファイルを植える**ため hold 自体は発火可能」 | **REFINED** | t528 は手植えではなく**本番 verb `subjects declare` を実行**しています（`tests/integration/t528-authoring-hold-end-to-end.integration.test.ts:134-152`）。さらに同ファイル `:186-193` に `this repository declares no governed subjects yet, so every intent keeps flowing` という**空間レベル不在を意図的に固定するテスト**が存在します |
| C11: 唯一の author-new 実行後も空間レベル `authoring-subjects.json` は未生成 | **CONFIRMED**（機序は下記のとおり別） | 空間レベル不在は C1 のとおり。ただし record 側には正当な宣言が存在（後述 K1/K2） |
| C12: 「#2766 の advisory 面が未完」 | **CONTRADICTED** | 書き手は #2766 の修正 PR #2779（`c0fca4ecba`, 2026-08-10）で導入済み。stage への配線は PR #2890（`387cbd0146`, 2026-08-11）。#2779 の表題自体が「供給経路と tla-authoring への**実行接続**を完成させる」（MERGED） |
| C13: ラベル `bug` / `S3-MAJOR` | **CONTRADICTED** | 誤動作の実証がありません（C6）。観測された no-hold は設計どおりかつテストで固定された状態（C10） |
| C14: ラベル `P3` | **CONFIRMED**（妥当） | 実効経路（scope-binding）が全担しており緊急性なし。分類を変更しても P3 は維持で問題ありません |

### 再現・コード実読

**R: 症状の再現（Issue の実測どおり）**

```
$ bun plugins/formal-model-check/tools/tla-authoring.ts advisory hold
{"ok":true,"verdict":{"kind":"no-hold"},"reason":"no governed subjects are declared"}   # exit 0
```

**F: 反証（本番書込経路のみで hold を発火させる）** — Issue の完了条件 2「fixture でなく**本番書込経路由来**の subjects で hold を返す落ちる実証」を、現行 SHA でそのまま満たせるかを試しました。出力先はリポジトリ外のスクラッチ、入力はリポジトリ内の実在 requirements 文書です。

```
# F1: 本番の書き手 verb
$ bun plugins/formal-model-check/tools/tla-authoring.ts subjects declare \
    --document amadeus/spaces/default/intents/260810-tla-applicability-wiring/inception/requirements-analysis/requirements.md \
    --kind requirements --id FR-1 --id FR-2 --out <scratch>/authoring-subjects.json
{"ok":true,"path":"<scratch>/authoring-subjects.json","identity":"sha256:f5ef53d62d710c5a1edf06441e2bb38a1a0b3ad7fccbbcc75e84eaf43aa3200b","subjects":["FR-1","FR-2"]}   # exit 0

# F3: その宣言を advisory が消費
$ bun plugins/formal-model-check/tools/tla-authoring.ts advisory hold --subjects-file <scratch>/authoring-subjects.json
{"ok":false,"verdict":{"kind":"hold","reasons":[{"kind":"stale-evidence","recorded":"sha256:7de7b5e3…","current":"sha256:f5ef53d6…"}]}}   # exit 1
```

**`kind:"hold"` が返っています。** 書き手・評価器・hold テーブルの連鎖はいずれも生きており、「構造的に発火し得ない」は成立しません。実行前後とも `git status --porcelain` は 0 行です。

**K: record 側の実宣言も評価に到達する**

`amadeus/spaces/default/intents/260811-pr-convergence-gate/construction/tla-authoring/governed-subjects.json` は `GovernedSubjects` 形状（`documents[]` + `subjects[]`）そのもので、advisory に食わせると

```
{"ok":true,"verdict":{"kind":"no-hold","basis":{"digest":"sha256:64ff99d9…"}}}   # exit 0
```

を返します。これは `reason: "no governed subjects are declared"` の**退化 no-hold とは別物**で、hold テーブルまで到達したうえでの評価済み no-hold（`basis.digest` 付き）です。同種の宣言は `260814-failopen-error-paths/construction/tla-authoring/subjects.json` にも存在します。

**T: 関連テストの現況（測定 ref = 127be70c5）**

| テスト | 結果 | exit |
|---|---|---|
| `tests/integration/t524-subjects-declare-writer.integration.test.ts` | 5 pass / 0 fail | 0 |
| `tests/integration/t450-tla-authoring-stage-e2e.integration.test.ts` | 13 pass / 0 fail | 0 |
| `tests/integration/t528-authoring-hold-end-to-end.integration.test.ts` | 3 pass / 0 fail | 0 |

実行前後で監査シャード 303 ファイルの md5 一覧は完全一致（record 汚染なし）、`git status --porcelain` も 0 行です。

### 機序・影響・ラベル

**主張された機序（書き手不在 → 永久 ENOENT → 常時 no-hold）は成立しません。** 誤検出の原因は grep 述語の構造的な取りこぼしです。書き手はパスを文字列リテラルではなく `defaultSubjectsPath()` の呼び出しで解決し（`:658`）、stage 側の配線は `subjects declare` という別語彙で書かれている（`stages/tla-authoring.md:53`）ため、`-F "authoring-subjects.json"` の単一キー述語では両方とも視野に入りません。これは project.md の `cid:application-design:dual-key-consumer-inventory`（変数名と展開後リテラルなど複数軸で検索キーを持つ）が想定する失敗様式そのものです。

**実在する残余（唯一、検討に値する面）** — 現行の観測は「壊れている」ではなく「**まだ採用していない**」です。

1. checkpoint の evaluator は `--subjects-file` を渡さないため、空間レベルの `amadeus/spaces/default/specs/authoring-subjects.json` を読みます（`plugin.json:83-89` + `:566`）。
2. docs の正準呼び出しは `--out` を伴わず、この既定パスへ書きます（`docs/reference/22-formal-model-supply.md:254-256`）。
3. しかし実運用 2 回の tla-authoring 実行は、宣言を intent record 配下（`governed-subjects.json` / `subjects.json`）に置いており、空間レベルへ昇格していません。両 record を `git grep -F "subjects declare"` しても実行痕跡は 0 件で、書き手経由かどうかも記録されていません。
4. その未採用状態を `t528:186-193` が `…declares no governed subjects **yet**…` として明示的に固定しています。

したがって残る問いは「本文が言う書き手の**所在**」ではなく、「**空間レベル宣言を採用するか否かの裁定**（採用するなら誰がいつ昇格させるか）」に縮退します。完了条件が裁定に閉じるため、team.md の種別判定（(1) 回答・裁定だけで閉じる → `question` / (4) 契約を追加・意図的に変更 → `enhancement`）に照らすと `bug` は成立しません。

なお **Issue の完了条件 2 は現行 SHA で既に充足済み**です — `t528` の第2テストが本番 verb 由来の宣言で hold → handoff → receipt による解放まで blocking で固定しており、上記 F1→F3 でも独立に再現できます。

**ラベル所見**

- `bug` → **不適合**。合意済み契約への違反が実証されていません。`question`（採用可否の裁定）または `enhancement`（昇格工程の追加）への変更を提案します。
- `S3-MAJOR`（「宣言された advisory 機能が全面不発火(誤動作)」）→ **不適合**。前提が反証されました。`bug` を維持しないのであれば重大度は非適用、仮に維持するとしても S4-MINOR 相当です。
- `P3` → 妥当。維持を推奨します。

### 訂正・未解決事項

**訂正**

1. 「書き手が本番コードに存在せず」（表題・根拠節）→ 存在します（`tla-authoring.ts:640-661`、PR #2779 で導入、`stages/tla-authoring.md:53` で配線、`t450:172` が固定）。
2. 「write 系呼び出しは 0 件」→ `:658-659` → `publishSubjects`（`:623-638`）で `writeFileSync` + `renameSync`。
3. 「構造的に一度も発火できない」→ 本番経路のみで hold を実測（F3）。
4. 「t528 は fixture としてファイルを植える」→ 本番 verb を実行しています（`t528:134-152`）。
5. 「#2766 の advisory 面が未完」→ #2766 の修正 PR #2779 が advisory 面の書き手そのものを導入しています。
6. `git ls-tree` の exit code は 1 ではなく 0（結論は不変ですが、証跡の再導出可能性のため訂正）。
7. `advisoryHold` の行域は `:565-597` ではなく `:565-599`。
8. codekb `component-inventory.md:492` は解決先を `specs/tla/authoring-subjects.json` と記していますが、現行の `:521` は `specsRoot` 直下です（`specs/authoring-subjects.json`）。codekb 側が旧断面のままで、本 Issue のパス記載のほうが現行コードに合致します。**codekb の当該行は別途更新が必要です**（本 Issue とは独立の drift）。

**未解決（裁定事項）**

- 空間レベル `authoring-subjects.json` を採用するか、採用しないまま維持するか。採用する場合、昇格の担い手（tla-authoring stage の Step 1 で `--out` を使わせない運用固定か、登録完了時の昇格工程の新設か）。
- 採用しない場合、`t528:186-193` の "yet" 固定を恒久的な設計表明として明文化するか。

**独立に検証していない面**

- consumer ワークスペースへの advisory 投影（#2823 / #2267 の別クラス）は本レビューの射程外です。
- `advisory hold` を実際の checkpoint 実行文脈（engine の advisory 発火経路）で通す統合実行は、t528 の in-repo 実行で代替しており、実 intent の checkpoint 走行としては未実測です。

### 同根・対称面

- **同根**: 「単一キーの文字列 grep で書き手・消費者の不在を結論する」形。本件では `-F "authoring-subjects.json"` が、関数経由のパス解決（`defaultSubjectsPath()`）と別語彙の配線（`subjects declare`）の両方を取りこぼしました。不在主張は、リテラル・シンボル名・CLI 語彙・パスセグメントの複数軸で採り直す必要があります。
- **対称面**: 同ファイルの姉妹 advisory `spec-change`（`plugin.json:56-75`、evaluator は `tools/plugin-activation.ts advisory`）は別経路のため本件の影響を受けません。
- **対称面**: 「ENOENT を正当な no-hold として扱う」設計は evidence store 側の配置（`tla-evidence` を watch glob 外に置く）と同じ思想の対で、`:516-519` に設計意図が明記されています。ここを変更する提案は両方に同時に効きます。

### 後続検証者向けメモ

- 再導出は測定 ref `127be70c5d7a584016f88a5d44e8715904020721` で行ってください。`git rev-parse HEAD` で一致を確認してから始めるのが最短です。
- 不在主張を再検証する場合は述語を複数軸にしてください。実際に使った述語: `git grep -n -F "authoring-subjects" <sha> -- plugins/ packages/ tests/ docs/ scripts/ .claude/`（7 ファイル）、`git grep -n -F "subjects declare" <sha>`、`git grep -n -F "defaultSubjectsPath" <sha>`。単一リテラル述語だけでは書き手に到達しません。
- 反証再現は「本番 verb で書く → `--subjects-file` で読ませる」の 2 コマンドで足ります。書込先は必ずリポジトリ外に取り、実行後に `git status --porcelain` が 0 行であることを確認してください。
- テスト実行時は監査シャードの md5 一覧（`find amadeus/spaces/default/intents -name '*.jsonl' -path '*audit*' -exec md5 {} \;`）を前後で比較すると、record 汚染の不在を機械確認できます（本レビューでは 303 ファイル完全一致）。
- `git ls-tree` の exit code を不在の根拠にしないでください（不一致でも 0 を返します）。出力行数で判定するのが正しい形です。

### Verdict

**CONTRADICTED** — Issue 表題および根拠節の中核主張「`authoring-subjects.json` の書き手が本番コードに存在せず、advisory authoring-hold が構造的に不発火」は、現行 SHA の実読と実行で反証されました。書き手 `subjects declare` は `tla-authoring.ts:640-661` に実在し、`stages/tla-authoring.md:53` で stage へ配線され、`t450:172` / `t524` / `t528` が blocking で固定しています。本番書込経路のみを使って advisory に `kind:"hold"` を返させる実証にも成功しました。

観測事実として正しいのは「この workspace には空間レベルの宣言が存在せず、そのため checkpoint の advisory は退化 no-hold を返す」という点のみで、これは欠陥ではなく `t528:186-193` が "yet" として意図的に固定した**未採用状態**です。残る論点は「空間レベル宣言を採用するかの裁定」に縮退するため、`bug` / `S3-MAJOR` は再分類（`question` または `enhancement`、重大度は非適用）を提案します。

本 verdict は実在確認であり実装着手・優先順位・クローズの承認ではありません。


#### j5ik2o — 2026-08-18T05:21:17Z — https://github.com/amadeus-dlc/amadeus/issues/3187#issuecomment-5323968384

## クロスレビュー（2人目・reviewer-2）: CONTRADICTED

<!-- issue-cross-review
review-run-id: xrev-3187-20260818
reviewer-id: reviewer-2
execution-subject-id: xr3187-r2@session-7727e262
target-sha: 127be70c5d7a584016f88a5d44e8715904020721
-->

### 独立性と対象

- 本レビューは起票者と独立した実行主体（`xr3187-r2@session-7727e262`）が、凍結された Issue 本文のみを主張集合として実施した。起票者の追加コメントは凍結時点で 0 件（`issue-3187-comments.json` = `[]`）。
- 対象 tree は `127be70c5d7a584016f88a5d44e8715904020721`（`git rev-parse HEAD` で確認、`git status --porcelain` は空 = clean）。本文の観測 ref `23d4ae767` から 5 コミット前進している。
- 判定はすべて上記 tree に対する再実測から導いた。本文の記述を根拠として引き継いだ主張はない。

### Claim ledger

| 主張 | 判定 | 独立エビデンス |
|---|---|---|
| C1: 宣言ファイル `amadeus/spaces/default/specs/authoring-subjects.json` が不在（gitignore 由来ではない） | CONFIRMED（証跡表記に訂正あり） | `git cat-file -e 127be70c5:amadeus/spaces/default/specs/authoring-subjects.json` → exit 128。作業ツリーにも不在（`ls` exit 1）。`git check-ignore -v` → exit 1（無視対象ではない）。ただし本文が引く `git ls-tree` は**出力 0 行・exit 0** であり、本文の「exit 1」は誤り |
| C2: **書き手が本番コードに存在しない**（唯一のヒットは `tla-authoring.ts:521`、write 系呼び出し 0 件） | **CONTRADICTED** | 同一ファイル `plugins/formal-model-check/tools/tla-authoring.ts` に書き手が実在する。`:601` 逐語 `// The sole writer of the governed-subjects declaration (D1 of #2766). Repeated`、`subjectsDeclare` `:640-661`、`publishSubjects` `:623-638`（`:627` `writeFileSync(staging, ...)`、`:628` `renameSync(staging, path)`）。`:658` 逐語 `const path = flags.out ?? defaultSubjectsPath();` — `defaultSubjectsPath` の消費点は read 側 `:566` と write 側 `:658` の 2 箇所であり、「使用箇所は `advisoryHold` の `readFileSync` のみ」は成立しない |
| C3: 本番ワークフローにこのファイルを書く工程が存在しない | **CONTRADICTED** | `plugins/formal-model-check/stages/tla-authoring.md:53` 逐語 `4. For a non-empty selected set, run `subjects declare`, then`。既定の呼び出し例（`--out` なし = 既定パスへ publish）は `docs/reference/22-formal-model-supply.md:247,:254` および対訳 `.ja.md:119,:122` |
| C4: `advisory hold` の出力が常時 no-hold | CONFIRMED | `bun plugins/formal-model-check/tools/tla-authoring.ts advisory hold` → `{"ok":true,"verdict":{"kind":"no-hold"},"reason":"no governed subjects are declared"}` exit 0。実行後も `git status --porcelain` は空 |
| C5: ENOENT を正当な no-hold として扱う設計 | CONFIRMED（行の訂正あり） | `tla-authoring.ts:567` 逐語 `// Only true absence is "nothing is governed here" (the ruled no-hold case).`、ENOENT 腕は `:574-575`。実体は `advisoryHold` `:565-599`（本文の「:565-597 付近」はほぼ一致） |
| C6: plugin.json が `authoring-hold`（RA / FD / BT → handoff `tla-authoring`）を宣言 | CONFIRMED | `plugins/formal-model-check/plugin.json:77` 以降。manifest 全体では advisories 2 件（`spec-change` / `authoring-hold`） |
| C7: t528 は fixture 植え込みで hold を発火させる（機構は生きている） | CONFIRMED（重大な補足あり） | `tests/integration/t528-...:134-152` が `subjects declare --out <fixture>` → `authoring-hold` raise → `guardAdvisoryChoices(...).kind === "hold"` を固定。**補足**: 同ファイル `:186-195` のテスト名逐語「this repository declares no governed subjects yet, so every intent keeps flowing」が、現在の不在と no-hold を**意図された契約として明示的にピン**している |
| C8: 唯一の author-new 実行が `governed-subjects.json` を record 内に保持 | CONFIRMED かつ **REFINED（機序の核心）** | tree 全体で該当ファイルは 1 件のみ（`amadeus/spaces/default/intents/260811-pr-convergence-gate/construction/tla-authoring/governed-subjects.json`）。その内容は `JSON.stringify(governed, null, 2) + "\n"`（= `publishSubjects:627` の書式）と**バイト一致**（257 バイト、再フォーマット結果と同一）。すなわち書き手は本番で実際に実行され、`--out` により record 内へ publish された |
| C9: 「#2766 の advisory 面が未完」 | **CONTRADICTED** | #2766 修正 intent の FR-5（Q3=A）受け入れ基準が逐語で現状を要求する: 「着地コミット時点で `authoring-subjects.json` は依然として存在せず、全既存 intent のワークフローが従前どおり進行すること」（`amadeus/spaces/default/intents/260810-tla-applicability-wiring/inception/requirements-analysis/requirements.md:33,:35`）。現状は未完ではなく**受理された段階導入の設計状態** |
| C10: 現行性（観測 ref から premise 不変） | CONFIRMED | `git log --oneline 23d4ae767..127be70c5` → 5 件。同レンジを `-- plugins/formal-model-check/ amadeus/spaces/default/specs/ packages/framework/core/tools/amadeus-advisory-declaration.ts` で絞ると **0 件**。患部は不変 |
| C11: 影響（早期 hold が死んでおり適用性検討が build-and-test 後まで遅延） | REFINED | 「hold が実運用で一度も発火していない」は事実。ただし原因は「死んでいる」ではなく「宣言が未投入（段階導入が未開始）」。なお hold 自体は checkpoint を止めるので、宣言さえあれば早期シグナルは成立する（t528:150-152） |
| C12: ラベル bug / S3-MAJOR / P3 | REFINED（bug・S3 は不成立） | 下記「機序・影響・ラベル」参照 |

### 再現・コード実読

再現はすべて frozen SHA `127be70c5` の checkout に対する read-only 実行。実行前後で `git status --porcelain` は空。

1. **不在の確認**: `git cat-file -e 127be70c5:amadeus/spaces/default/specs/authoring-subjects.json` → exit 128。`git check-ignore -v <同 path>` → exit 1。
2. **解決先パスの実測**: `defaultSubjectsPath(<repoRoot>)` を直接呼び出し → `<repoRoot>/amadeus/spaces/default/specs/authoring-subjects.json`。`resolveSpecRoots`（`plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts:126-139`）の `specsRoot` は `amadeus/spaces/<space>/specs`。**本文のパス表記は現行コードと一致しており正しい**（後述のとおり codekb 側が stale）。
3. **advisory の再現**: 上記 C4 のとおり逐語一致・exit 0。
4. **書き手の実読**: `tla-authoring.ts:80`（USAGE `subjects declare --document <path> --kind <requirements|decisions> --id <stable-id>`）、`:640-661`（`subjectsDeclare`）、`:623-638`（staging + rename の atomic publish）。書込前に `governedIdentity` で全 id を解決し、解決不能なら何も書かず fail-closed（`:656-657`）。
5. **回帰テストの実行**: `bun test tests/integration/t524-subjects-declare-writer.integration.test.ts tests/integration/t528-authoring-hold-end-to-end.integration.test.ts` → **8 pass / 0 fail / 39 expect**、exit 0。
6. **evaluator の起動条件**: `packages/framework/core/tools/amadeus-advisory-declaration.ts:423-424` 逐語 `spawnSync(argv[0] as string, args, { cwd: projectRoot, ...})`。したがって `advisory hold` は host の project root を cwd として起動され、`defaultSubjectsPath()` は正しい workspace を指す。**私の再現は本番 invocation と同一条件**である。

### 機序・影響・ラベル

**実際の機序（本文の機序とは異なる）。** 書き手は #2766 の修正 PR #2779 で着地済みである — `git log --reverse -S "function subjectsDeclare" -- plugins/formal-model-check/tools/tla-authoring.ts` の初出は `c0fca4ecba`（2026-08-10 12:22:20 +0900、`fix(formal-model-check): TLA+ 適用判定の供給経路と tla-authoring への実行接続を完成させる (#2779)`）で、回帰テスト `tests/integration/t524-subjects-declare-writer.integration.test.ts` も同コミットで新規追加されている。#2766 は 2026-08-10T03:22:22Z に COMPLETED でクローズ済み。本 Issue の起票（2026-08-18T00:48:41Z）はその **8 日後**であり、本文は #2766 の修正**前**の状態（書き手 0 件）を現在形で再記述している。本文が「PR #2779（供給経路）で grid 経路は解消」と自ら記しながら、その同じ PR が書き手であることを見落としている内部矛盾がある。

**不在主張の述語不足。** 本文の探索述語は `git grep -n -F "authoring-subjects.json" -- plugins/ packages/` である。書き手はパスを `defaultSubjectsPath()` 経由で解決するためリテラル文字列を持たず、この述語では**構造的に発見できない**。得られた唯一のヒット `:521` は read 側と write 側が共有する解決関数そのものであり、そこから「write 系 0 件」を導く推論が成立しない。`git grep -n -F "defaultSubjectsPath"` / `-F "subjects declare"` / `-F "subjectsDeclare"` のいずれか 1 本で書き手に到達する。

**では何が実際に起きているか。** 唯一の author-new 実行（`260811-pr-convergence-gate`）は書き手を実行しているが、`--out` で record 内（`.../construction/tla-authoring/governed-subjects.json`）へ publish しており、space レベルの既定パスへは publish していない。書式のバイト一致（257 バイト）がこれを裏づける。よって残る事実は「**既定パスへの publish が一度も行われていない = 段階導入の第一号がまだ投入されていない**」であり、「書き手が存在しない」ではない。

**その状態は defect ではなく受理された設計状態である。** FR-5（Q3=A）が着地時点の不在を受け入れ基準として明文化し、`tests/integration/t528-...:186-195` がそれを回帰テストとしてピンしている。`docs/reference/22-formal-model-supply.md:236-240` も「A workspace that declares nothing governs nothing, which is a real no-hold rather than a suppressed one」と、抑制された no-hold ではない旨を契約として述べている。現行挙動は文書化された契約に**一致**する。

**ラベル評価**（`.github/ISSUE_TEMPLATE/bug.yml` / `enhancement.yml` の完了条件判定に照らす）:

- **type**: `bug` は不成立。判定順序（回答・裁定で閉じる→`question` / 文書面だけ→`documentation` / **既存の合意済み契約に違反**→`bug` / 契約を追加・意図的に変更→`enhancement`）を当てると、現行挙動は FR-5・t528 ピン・docs 22 の三面と一致しており違反がない。本 Issue の完了条件 1 は「書き手の所在を**裁定**する」であり、活かす場合は space レベル publish 工程の**追加**（= 契約の追加）になる。したがって `question`（裁定のみで閉じるなら）または `enhancement`（段階導入を前進させるなら）が適合する。
- **severity**: `S3-MAJOR` は「回避策のある**誤動作**」を前提とするが、誤動作が成立しないため不成立。type を改めるなら S ラベル自体が不要になる。
- **priority**: `P3`（いつか対応）は妥当。実効経路が別に成立しており緊急性はない。

**放置の害は残る。** 本文の「宣言と実態の乖離（発火し得ない advisory の宣言）を残さない」という懸念自体は妥当である。ただし乖離の内容は「宣言はあるが機構が無い」ではなく「機構は完成しているが、このワークスペースがまだ opt-in していない」である。この差は完了条件の書き方を変える（退役 vs. 第一号 subject の投入、のいずれも「未完のバグを直す」作業ではない）。

### 訂正・未解決事項

**訂正 1（本 Issue）**: 「書き手が本番コードに存在しない」「本番ワークフローで書く工程が存在しない」「#2766 の advisory 面が未完」の 3 点は frozen SHA で成立しない。タイトルもこの前提に依存している。

**訂正 2（本 Issue）**: 証跡の `git ls-tree ... → 0 行・exit 1` のうち exit code が誤り。`git ls-tree` は不一致でも exit 0 を返す（実測: 4 変種すべて exit 0）。不在の機械証明には `git cat-file -e`（exit 128）を使う。exit code を根拠に不在を主張する形は、述語自体の健全性検査（`cid:reverse-engineering:c6-absence-predicate-exit-code`）の対象である。

**訂正 3（本 Issue 外・codekb の stale）**: `amadeus/spaces/default/codekb/amadeus/component-inventory.md:492` は解決先を `amadeus/spaces/default/specs/tla/authoring-subjects.json` と記し、行ピンも `defaultSubjectsPath :453-455` などとするが、現行は specs ルート直下（`tla-authoring.ts:516-521` の D4 移設）で、行は `:520-522` へ移動している。**この点は Issue 本文のパス表記のほうが正しい**。codekb の当該行は次のスキャンで更新対象。

**未解決（裁定事項として残る）**: 「space レベルの governed subjects を誰がいつ宣言するか」は依然として未決である。stage 手順（`stages/tla-authoring.md:53`）は `subjects declare` の実行を指示するが、`--out` の宛先（既定パスか record 内か）を規定していない。実測された唯一の実行は record 内を選んでおり、既定パスへ publish する運用は未確立である。これは本 Issue の完了条件 1 の実質であり、`enhancement` として再定義すれば有効な起票になる。

### 同根・対称面

- **兄弟 advisory `spec-change`**: 同 manifest の唯一の他 advisory。`bun plugins/formal-model-check/tools/plugin-activation.ts advisory <root> requirements-analysis` → `{"verdict":{"kind":"no-hold"}}` exit 0 で、こちらも現在 no-hold である。ただし判定源は activation judgment（`ACTIVATION_WATCH_GLOBS = ["tla/**"]`、`plugin-activation.ts:50`、`specHashAdvisories:286-322`）であり、宣言ファイル供給とは別機構。**同根ではない**（同クラスの欠陥として扱わないこと）。
- **全 plugin の advisory 棚卸し**（述語: `plugins/*/plugin.json` を parse して `advisories[]` を列挙、対象集合 = frozen SHA の 4 manifest、除外なし）: `coverage-patch-quick` 0 件 / `formal-model-check` 2 件 / `git-drift` 0 件 / `github-pr-convergence` 0 件。「宣言はあるが供給がない advisory」の同型は他に存在しない。
- **反証済みの仮説（対称面の空振り）**: 「`authoring-hold` の evaluator argv が `{host-root}` を持たないため cwd 取り違えで別ワークスペースを読んでいる」という仮説を立てて検証したが**反証**された。プレースホルダは `resolveArgvTokens`（`amadeus-advisory-declaration.ts:147-167`）が解決し、呼出は `:459` の `{ "host-root": hostRoot, stage }`。加えて evaluator は `cwd: projectRoot` で起動される（`:423-424`）ため、argv に placeholder が無くても解決先は正しい。
- **本文が触れていない構造要因（追加観測）**: `plugins/formal-model-check/stages/tla-authoring.md` の frontmatter は `requires_stage: - build-and-test` を宣言しており、handoff 先 stage はグラフ上 build-and-test の後段に順序づけられる（`packages/framework/core/tools/amadeus-graph.ts:919,:935` が requires_stage を順序辺として消費）。本文の「適用性の検討が常に実装後まで遅延する」という影響記述は、advisory の不発火よりむしろこの順序辺に帰属する可能性がある。ただし hold 自体は RA checkpoint を停止させる（t528:150-152）ため、「早期シグナル」と「早期 authoring」は分けて論じる必要がある。**これは仮説であり、順序辺と hold の相互作用の実測は本レビューでは未実施**。

### 後続検証者向けメモ

- 測定 ref はすべて `127be70c5d7a584016f88a5d44e8715904020721`（clean tree）。実行はすべて read-only で、各実行後に `git status --porcelain` が空であることを確認済み。
- 不在主張を再検証する場合、`git ls-tree` の exit code は不在の証明に使えない（不一致でも exit 0）。`git cat-file -e <sha>:<path>` の exit 128、または `git ls-files --error-unmatch` を使うこと。
- 「書き手が無い」型の主張は、リテラルなファイル名 grep では検証できない。パス解決関数（本件では `defaultSubjectsPath`）の**消費点**を軸に列挙し、書込 API（`writeFileSync` / `renameSync` / `Bun.write`）の在否を同一ファイル内で直接確認すること。本件は `git grep -n -F "defaultSubjectsPath"` 1 本で read 側 `:566` と write 側 `:658` の非対称が可視化される。
- 生成物が「どのツールが書いたか」を判定するには、`JSON.stringify(x, null, 2) + "\n"` との**バイト一致**が安価で強い述語（本件で record 内ファイルの出自を確定した手段）。
- 本レビューは GitHub 上の本 Issue のコメントを取得していない（凍結ファイルは 0 件）。#2766 / 関連 Issue のメタデータのみ read-only の `gh issue view --json` / `gh issue list --search` で参照した。

### Verdict

**CONTRADICTED。** 症状（`advisory hold` が no-hold を返す）と現行性は再現できるが、本 Issue が主張する機序 — 「書き手が本番コードに存在しない」「本番ワークフローに書く工程が存在しない」「#2766 の advisory 面が未完」 — は frozen SHA `127be70c5` で 3 点とも成立しない。書き手 `subjects declare` は #2766 の修正 PR #2779（`c0fca4ecba`、2026-08-10）で着地し回帰テスト付きで生きており、stage 手順もその実行を指示している。現在の不在と no-hold は FR-5（Q3=A）が受け入れ基準として明文化し `t528:186-195` がピンする**受理された段階導入の状態**であって、誤動作ではない。したがって `bug` / `S3-MAJOR` のラベルは支持されない。

残る有効な論点は「space レベル宣言の第一号を誰がいつ投入するか（または advisory を退役させるか）」の裁定であり、前提を訂正したうえで `enhancement`（または `question`）として起票し直せば有効である。実装着手する場合も、着手前に本文の機序記述を上記の実測へ差し替えること。

本 verdict は実在確認であり実装着手・優先順位・クローズの承認ではありません。


### その他コメント(verbatim、任意)

#### j5ik2o — 2026-08-18T05:21:37Z — https://github.com/amadeus-dlc/amadeus/issues/3187#issuecomment-5323970580

## Cross-review convergence — NOT_ESTABLISHED

- Reviewer 1: `CONTRADICTED` / Reviewer 2: `CONTRADICTED`(独立、run xrev-3187-20260818、target SHA `127be70c5`)
- **収束判定: NOT_ESTABLISHED** — 中核主張「authoring-subjects.json の書き手が本番コードに存在せず advisory authoring-hold が構造的に不発火」は両名が一次証拠で反証(書き手 `subjects declare` = `tla-authoring.ts:640-661` に実在・stage 手順 `stages/tla-authoring.md:53` で配線・t450/t524/t528 が blocking で固定。#2766 の修正は PR #2779 で着地済み)
- 観測事実として残るのは「本 workspace に space レベル宣言が未投入のため advisory が退化 no-hold を返す」= t528 が "yet" として固定する**受理済みの段階導入状態**であり、欠陥ではない
- 両名の提案: 前提を実測へ差し替えたうえで `enhancement` または `question`(space 宣言第一号の投入 or advisory 退役の裁定)として再構成

ラベル変更・クローズ・再起票の判断はユーザーに委ねます(本コメントは収束結果の記録のみ)。


#### j5ik2o — 2026-08-18T07:02:57Z — https://github.com/amadeus-dlc/amadeus/issues/3187#issuecomment-5324758672

## 種別再構成: bug → question(ユーザー裁定 2026-08-18)

クロスレビュー収束 NOT_ESTABLISHED(run `xrev-3187-20260818`、両名 CONTRADICTED、target SHA `127be70c5`)を受け、ユーザー裁定により本 Issue を `question` へ再構成する。

### 実測へ差し替えた前提

- 中核主張「`authoring-subjects.json` の書き手が本番コードに存在しない」は反証済み — 書き手 `subjects declare` は `plugins/formal-model-check/tools/tla-authoring.ts:640-661`(`publishSubjects` :623-638)に実在し、stage 手順 `plugins/formal-model-check/stages/tla-authoring.md:53` で配線済み。#2766 の修正は PR #2779 で着地済み
- 残る観測事実は「本 workspace に space レベル宣言(`amadeus/spaces/default/specs/authoring-subjects.json`)が未投入のため、advisory authoring-hold が退化 no-hold を返す」— これは t528 が "yet" として固定する受理済みの段階導入状態であり、欠陥ではない

### 問い(本 Issue の完了条件 = 裁定)

次のどちらへ進めるかの裁定を求める:

1. **space 宣言第一号を投入する** — governed subjects を宣言し、advisory authoring-hold を実効化する
2. **advisory authoring-hold を退役する** — 段階導入を打ち切り、機構を削除する

裁定成立をもって本 Issue はクローズし、実装が必要になった側を `enhancement` として別途起票する。

### ラベル操作の記録

- 除去: `bug`(主張反証につき種別不成立)、`S3-MAJOR`(重大度は bug 専用軸)
- 追加: `question`
- 維持: `P3`


#### j5ik2o — 2026-08-20T06:52:33Z — https://github.com/amadeus-dlc/amadeus/issues/3187#issuecomment-5352456209

## ユーザー裁定(2026-08-20): 退役

本 question の裁定として、ユーザー(実 HUMAN_TURN、2026-08-20)が **「advisory authoring-hold 経路を退役する」** を選択した。

- **裁定内容**: 一度も発火できない advisory authoring-hold 経路(`authoring-subjects.json` の書き手不在)は活かさず退役する。tla-authoring の起動は scope-binding による stage grid 経由(実効経路、25/25 実行実績)へ一本化する。
- **完了条件**(本 Issue 期待結果 3 に従う): `plugin.json` の advisories 宣言・`tla-authoring.ts` の advisory 経路コード(`advisoryHold` / `defaultSubjectsPath` 等)・`t528` テストの扱いを**同一変更**で整理する。
- **追加制約**(同裁定): 後方互換レイヤー・フォールバック分岐は残さない。完全撤去とする。
- **実施先**: #3186 / #2289 / #2929 と同一バッチの intent(multi-unit)で、退役を 1 unit として実装する。grid 経路への一本化は #3186 のトリガ設計(語彙 drift 検出・欠陥再発トリガ)の前提整理を兼ねる。

裁定成立により本 Issue は「回答・裁定で閉じる」条件を満たすが、クローズは退役実装の PR MERGED と着地面の実読確認後に行う(close-after-landing-verification)。
